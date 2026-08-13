/**
 * Quiz scoring uses the LMS submit/attempt payload and course quiz config.
 * Percentage = earned / total points. Pass if percentage >= passingPercentage
 * from the quiz/course (never a hardcoded 70).
 * Correct answers are shown only when the API/JSON answer key provides them.
 */

export function questionPrompt(question) {
  return question?.question || question?.prompt || question?.text || 'Question';
}

export function optionLabel(option) {
  return option?.text || option?.label || option?.value || 'Option';
}

export function quizPassingPercentage(quiz, result) {
  const n = Number(
    result?.passingPercentage
    ?? result?.passPercentage
    ?? result?.passMark
    ?? quiz?.passingPercentage
    ?? quiz?.passPercentage
    ?? quiz?.passMark,
  );
  return Number.isFinite(n) && n >= 0 ? n : 60;
}

function questionList(result) {
  const list =
    result?.questionResults
    || result?.questions
    || result?.answerResults
    || result?.answers
    || [];
  return Array.isArray(list) ? list : [];
}

export function quizPoints(result) {
  const earnedDirect = Number(
    result?.earnedPoints ?? result?.score ?? result?.marksObtained ?? result?.pointsEarned,
  );
  const totalDirect = Number(
    result?.totalPoints ?? result?.maxScore ?? result?.totalMarks ?? result?.pointsPossible,
  );
  if (Number.isFinite(totalDirect) && totalDirect > 0) {
    return {
      earned: Number.isFinite(earnedDirect) ? earnedDirect : 0,
      total: totalDirect,
    };
  }

  const questions = questionList(result);
  if (questions.length) {
    const earned = questions.reduce((sum, q) => {
      if (q?.earnedPoints != null) return sum + Number(q.earnedPoints);
      if (q?.points != null && q?.correct != null) {
        return sum + (q.correct ? Number(q.points) : 0);
      }
      if (q?.correct === true) return sum + Number(q.marks || q.maxPoints || 1);
      if (q?.correct === false) return sum;
      return sum;
    }, 0);
    const total = questions.reduce(
      (sum, q) => sum + Number(q.totalPoints ?? q.marks ?? q.maxPoints ?? q.points ?? 1),
      0,
    );
    if (total > 0) return { earned, total };
  }

  return {
    earned: Number.isFinite(earnedDirect) ? earnedDirect : 0,
    total: Number.isFinite(totalDirect) ? totalDirect : 0,
  };
}

export function quizPercentage(result, quiz) {
  if (result?.percentage != null && Number.isFinite(Number(result.percentage))) {
    return Math.round(Number(result.percentage) * 10) / 10;
  }
  if (result?.scorePct != null && Number.isFinite(Number(result.scorePct))) {
    return Math.round(Number(result.scorePct) * 10) / 10;
  }
  const { earned, total } = quizPoints(result);
  if (total > 0) return Math.round((earned / total) * 1000) / 10;
  if (typeof result?.passed === 'boolean' && quiz) {
    return result.passed ? Math.max(quizPassingPercentage(quiz, result), 100) : 0;
  }
  return 0;
}

export function quizPassed(result, quiz) {
  const pct = quizPercentage(result, quiz);
  const passMark = quizPassingPercentage(quiz, result);
  if (result && typeof result.passed === 'boolean') {
    // Trust API when it evaluated; still expose computed pct for the UI.
    return Boolean(result.passed);
  }
  return pct >= passMark;
}

export function kidsPassFailCopy(passed) {
  if (passed) {
    return {
      headline: 'Great Job!',
      technical: 'PASS',
      tone: 'success',
    };
  }
  return {
    headline: 'Keep Practicing!',
    technical: 'FAIL',
    tone: 'practice',
  };
}

function indexQuestions(quiz) {
  const map = new Map();
  (quiz?.questions || []).forEach((q) => {
    if (q?.id) map.set(String(q.id), q);
  });
  return map;
}

/**
 * Build review rows from the submitted result. Correct option text is included
 * only when the API/JSON answer key supplies it — never guessed.
 */
export function quizReviewRows(result, quiz) {
  const byId = indexQuestions(quiz);
  const rows = questionList(result);
  if (!rows.length && quiz?.questions?.length) {
    return (quiz.questions || []).map((q, index) => ({
      id: q.id || `q-${index}`,
      index,
      prompt: questionPrompt(q),
      selectedOptionId: null,
      selectedText: '',
      correct: null,
      correctOptionId: null,
      correctText: '',
      points: Number(q.marks || 1),
      earned: null,
    }));
  }

  return rows.map((row, index) => {
    const qid = row.questionId || row.id;
    const question = byId.get(String(qid)) || row.question || row;
    const options = question.options || [];
    const selectedId = row.selectedOptionId || row.answerOptionId || row.selectedId;
    const selected = options.find((o) => String(o.id) === String(selectedId));
    const apiCorrectId =
      row.correctOptionId
      || row.correctAnswerId
      || row.answerKeyOptionId
      || (options.find((o) => o.correct === true)?.id);
    // Learner review: only use correct flag/id from the *result*. Course-editor
    // `option.correct` is staff-only; do not treat it as a guess for parents.
    const resultRevealedCorrect = Boolean(
      row.correctOptionId || row.correctAnswerId || row.answerKeyOptionId || row.correctOption,
    );
    const correctOption = resultRevealedCorrect
      ? (options.find((o) => String(o.id) === String(apiCorrectId))
        || row.correctOption
        || null)
      : null;
    const correctFlag = typeof row.correct === 'boolean' ? row.correct : null;

    return {
      id: qid || `q-${index}`,
      index,
      prompt: questionPrompt(question),
      selectedOptionId: selectedId || null,
      selectedText: optionLabel(selected) || row.selectedText || row.answerText || '',
      correct: correctFlag,
      correctOptionId: resultRevealedCorrect ? (apiCorrectId || null) : null,
      correctText: resultRevealedCorrect
        ? (optionLabel(correctOption) || row.correctText || row.answerKeyText || '')
        : '',
      points: Number(row.totalPoints ?? row.marks ?? question.marks ?? 1),
      earned: row.earnedPoints != null
        ? Number(row.earnedPoints)
        : (correctFlag === true ? Number(row.marks ?? question.marks ?? 1) : (correctFlag === false ? 0 : null)),
    };
  });
}

export function normalizeQuizSubmitResult(raw, quiz) {
  const payload = raw?.result || raw?.attempt || raw || {};
  const nestedAttempt = raw?.attempt && raw.attempt !== payload ? raw.attempt : payload;
  const merged = { ...payload, ...nestedAttempt, ...raw };
  const pct = quizPercentage(merged, quiz);
  const passMark = quizPassingPercentage(quiz, merged);
  const passed = quizPassed(merged, quiz);
  const points = quizPoints(merged);
  const attempts = merged.attempts || raw?.attempts || quiz?.attempts || [];
  const best = Number(
    merged.bestScore
    ?? merged.bestPercentage
    ?? quiz?.bestScore
    ?? quiz?.bestPercentage
    ?? (Array.isArray(attempts) && attempts.length
      ? Math.max(...attempts.map((a) => Number(a.percentage ?? a.scorePct ?? a.score ?? 0)))
      : pct),
  );

  return {
    raw: merged,
    passed,
    percentage: pct,
    passingPercentage: passMark,
    earnedPoints: points.earned,
    totalPoints: points.total,
    attemptId: merged.id || merged.attemptId || nestedAttempt.id || null,
    attemptsRemaining: merged.attemptsRemaining ?? quiz?.attemptsRemaining ?? null,
    maxAttempts: merged.maxAttempts ?? quiz?.maxAttempts ?? 0,
    attemptNumber: merged.attemptNumber ?? merged.attemptCount ?? null,
    bestScore: Number.isFinite(best) ? best : pct,
    review: quizReviewRows(merged, quiz),
    copy: kidsPassFailCopy(passed),
  };
}

export function attemptsRemaining(quiz, result) {
  const max = Number(quiz?.maxAttempts ?? result?.maxAttempts ?? 0);
  if (!max) return Infinity;
  const used = Number(
    result?.attemptNumber
    ?? result?.attemptCount
    ?? quiz?.attemptCount
    ?? (Array.isArray(quiz?.attempts) ? quiz.attempts.length : 0),
  );
  const remaining = result?.attemptsRemaining;
  if (remaining != null) return Number(remaining);
  return Math.max(0, max - used);
}

export function canRetryQuiz(quiz, result) {
  const remaining = attemptsRemaining(quiz, result);
  return remaining > 0;
}
