/**
 * LMS course completion / certificate eligibility.
 * A certificate is earned only when required lessons are done AND required
 * quizzes passed (API `passed === true` or percentage >= quiz passPercentage).
 * Exhausted attempts are NOT a pass. Backend `canComplete` is not trusted
 * when the quiz failed.
 */

import {
  kidsPassFailCopy,
  quizPassed,
  quizPassingPercentage,
  quizPercentage,
} from './lmsQuizScoring.js';

function asList(value) {
  return Array.isArray(value) ? value : [];
}

export function sourceQuizzes(source) {
  if (!source || typeof source !== 'object') return [];
  const nested = source.enrollment && typeof source.enrollment === 'object'
    ? source.enrollment
    : null;
  const fromSource = asList(source.quizzes);
  if (fromSource.length) return fromSource;
  return asList(nested?.quizzes);
}

export function sourceLessons(source) {
  if (!source || typeof source !== 'object') return [];
  const nested = source.enrollment && typeof source.enrollment === 'object'
    ? source.enrollment
    : null;
  const fromSource = asList(source.lessons);
  if (fromSource.length) return fromSource;
  return asList(nested?.lessons);
}

export function requiredQuizzes(source) {
  return sourceQuizzes(source).filter((quiz) => quiz?.requiredForCompletion !== false);
}

export function quizWasAttempted(quiz) {
  if (!quiz || typeof quiz !== 'object') return false;
  if (Number(quiz.attemptCount || quiz.attemptsUsed || 0) > 0) return true;
  if (quiz.attemptsRemaining != null && quiz.maxAttempts != null) {
    const used = Number(quiz.maxAttempts) - Number(quiz.attemptsRemaining);
    if (used > 0) return true;
  }
  if (asList(quiz.attempts).length) return true;
  if (quiz.bestScore != null || quiz.bestPercentage != null || quiz.percentage != null) return true;
  if (quiz.latestAttempt || quiz.bestAttempt) return true;
  return false;
}

export function lessonsAllComplete(source) {
  const lessons = sourceLessons(source);
  if (!lessons.length) return false;
  return lessons.every((lesson) => (
    lesson?.progressStatus === 'completed'
    || lesson?.status === 'completed'
  ));
}

function numericOrNull(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
}

function pickPercentage(record, quiz) {
  const direct = numericOrNull(
    record?.bestScore
    ?? record?.bestPercentage
    ?? record?.percentage
    ?? record?.quizPercentage
    ?? record?.scorePct
    ?? record?.score,
  );
  if (direct != null) return direct;
  if (quiz) {
    const fromQuiz = numericOrNull(
      quiz.bestScore ?? quiz.bestPercentage ?? quiz.percentage ?? quiz.scorePct,
    );
    if (fromQuiz != null) return fromQuiz;
    const computed = quizPercentage(quiz, quiz);
    if (computed) return computed;
  }
  return null;
}

function latestAttempt(quiz) {
  if (!quiz) return null;
  if (quiz.latestAttempt && typeof quiz.latestAttempt === 'object') return quiz.latestAttempt;
  if (quiz.bestAttempt && typeof quiz.bestAttempt === 'object') return quiz.bestAttempt;
  const attempts = asList(quiz.attempts);
  return attempts.length ? attempts[attempts.length - 1] : null;
}

export function requiredQuizzesPassed(source) {
  const required = requiredQuizzes(source);
  if (!required.length) return true;
  return required.every((quiz) => {
    if (typeof quiz.passed === 'boolean') return quiz.passed === true;
    const attempt = latestAttempt(quiz);
    if (attempt && typeof attempt.passed === 'boolean') return attempt.passed === true;
    return quizPassed(attempt || quiz, quiz);
  });
}

/** Trust pass/fail only after a real attempt, or an explicit pass. */
function trustedPassedFlag(value, hasAttempt) {
  if (typeof value !== 'boolean') return null;
  if (value === true) return true;
  return hasAttempt ? false : null;
}

export function enrollmentQuizOutcome(source) {
  const quiz = requiredQuizzes(source)[0] || sourceQuizzes(source)[0] || source?.quiz || null;
  const attempt = latestAttempt(quiz);
  const record = source && typeof source === 'object' ? source : {};
  const nestedCert = record.certificate && typeof record.certificate === 'object'
    ? record.certificate
    : {};

  const required = requiredQuizzes(source);
  const attempted = required.length
    ? required.some(quizWasAttempted)
    : Boolean(
      quizWasAttempted(quiz)
      || pickPercentage(record, null) != null
      || pickPercentage(nestedCert, null) != null
      || record.quizPercentage != null,
    );

  let passed = trustedPassedFlag(record.passed, attempted)
    ?? trustedPassedFlag(nestedCert.passed, attempted)
    ?? trustedPassedFlag(quiz?.passed, quizWasAttempted(quiz))
    ?? trustedPassedFlag(attempt?.passed, Boolean(attempt));

  const passingPercentage = quizPassingPercentage(
    quiz,
    attempt || record || nestedCert,
  );
  let percentage = pickPercentage(record, quiz)
    ?? pickPercentage(nestedCert, quiz)
    ?? pickPercentage(attempt, quiz);

  // API often sends passed:false before any attempt — that means "not yet", not FAIL.
  const everyRequiredResolved = required.length > 0 && required.every(
    (q) => quizWasAttempted(q) || q?.passed === true,
  );
  if (everyRequiredResolved) {
    passed = requiredQuizzesPassed(source);
    const scores = required
      .map((q) => pickPercentage(q, q) ?? pickPercentage(latestAttempt(q), q))
      .filter((n) => n != null);
    if (scores.length) percentage = Math.max(...scores);
  } else if (passed == null && percentage != null && attempted) {
    passed = percentage >= passingPercentage;
  }

  if (!attempted && passed !== true) {
    passed = null;
    percentage = null;
  }

  const copy = passed == null ? { headline: '', technical: '', tone: '' } : kidsPassFailCopy(passed);
  return {
    attempted,
    passed,
    percentage,
    passingPercentage,
    headline: copy.headline,
    technical: copy.technical,
    tone: copy.tone,
  };
}

/** Lessons complete + required quizzes actually passed. Never uses attemptsExhausted. */
export function canCompleteCourse(detail) {
  if (!detail) return false;
  const enrollment = detail.enrollment && typeof detail.enrollment === 'object'
    ? detail.enrollment
    : detail;
  const status = String(enrollment?.status || detail.status || '').toLowerCase();
  if (status === 'completed') return false;
  if (!requiredQuizzesPassed(detail)) return false;
  const lessons = sourceLessons(detail);
  if (lessons.length) return lessonsAllComplete(detail);
  return false;
}

export function isFailedEnrollment(record) {
  const root = record && typeof record === 'object' ? record : {};
  if (root.passed === false || root.certificate?.passed === false) return true;
  const outcome = enrollmentQuizOutcome(record);
  if (outcome.attempted && outcome.passed === false) return true;
  const required = requiredQuizzes(record);
  if (required.length && required.some(quizWasAttempted) && !requiredQuizzesPassed(record)) {
    return true;
  }
  const hints = [root.result, root.outcome, root.quizResult, root.certificateStatus];
  return hints.some((value) => /fail/i.test(String(value || '')));
}

export function hasEarnedCertificate(record) {
  if (!record) return false;
  const id = record.certificateId
    || record.certificate?.id
    || record.certificate?.certificateId;
  const number = record.certificateNumber || record.certificate?.certificateNumber;
  if (!id && !number) return false;
  if (isFailedEnrollment(record)) return false;
  return true;
}

export function mergeLearningOntoCertificate(cert, learningItems = []) {
  if (!cert) return cert;
  const enrollmentId = String(cert.enrollmentId || cert.enrollment?.id || '');
  const studentId = String(cert.studentId || '');
  const courseId = String(cert.courseId || '');
  const match = (learningItems || []).find((row) => {
    const rid = String(row?.id || row?.enrollmentId || '');
    if (enrollmentId && rid && enrollmentId === rid) return true;
    if (studentId && courseId
      && String(row?.studentId || '') === studentId
      && String(row?.courseId || '') === courseId) {
      return true;
    }
    return false;
  });
  if (!match) return cert;
  const quiz = (match.quizzes || [])[0];
  return {
    ...cert,
    quizzes: cert.quizzes?.length ? cert.quizzes : match.quizzes,
    passed: cert.passed ?? match.passed ?? quiz?.passed,
    bestScore: cert.bestScore ?? match.bestScore ?? quiz?.bestScore ?? quiz?.bestPercentage,
    percentage: cert.percentage ?? match.percentage ?? match.quizPercentage ?? quiz?.percentage,
    quizPercentage: cert.quizPercentage ?? match.quizPercentage,
    passingPercentage: cert.passingPercentage
      ?? match.passingPercentage
      ?? quiz?.passPercentage
      ?? quiz?.passingPercentage,
    learnerName: cert.learnerName || match.learnerName,
    courseTitle: cert.courseTitle || match.courseTitle,
    studentId: cert.studentId || match.studentId,
    courseId: cert.courseId || match.courseId,
    enrollmentId: cert.enrollmentId || match.id || match.enrollmentId,
  };
}

export function keepEarnedCertificates(certs, learningItems = []) {
  return (certs || [])
    .map((cert) => mergeLearningOntoCertificate(cert, learningItems))
    .filter((cert) => !isFailedEnrollment(cert));
}

export function learningRowsWithEarnedCertificates(learningItems = []) {
  return (learningItems || []).filter((row) => (
    (row?.certificateId || row?.certificate?.id)
    && hasEarnedCertificate(row)
  ));
}
