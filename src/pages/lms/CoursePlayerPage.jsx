import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Award, CheckCircle2, Circle, HelpCircle, Play, Sparkles,
} from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { EmptyState, LoadingState, PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import LmsLessonMediaPlayer from '../../components/lms/LmsLessonMediaPlayer.jsx';
import QuizResultsPanel from '../../components/lms/QuizResultsPanel.jsx';
import LessonPractice from '../../components/lms/LessonPractice.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { lmsApi } from '../../services/lmsService.js';
import { mergeCourseCertificateConfig } from '../../data/defaultCourseCertificateConfig.js';
import { openLmsCertificatePreview } from '../../utils/courseCertificateHtml.js';
import { mergeCertificateRecords } from '../../utils/courseCertificateFields.js';
import {
  normalizeQuizSubmitResult,
  optionLabel,
  questionPrompt,
} from '../../utils/lmsQuizScoring.js';
import {
  canCompleteCourse,
  enrollmentQuizOutcome,
  hasEarnedCertificate,
} from '../../utils/lmsEnrollmentOutcome.js';
import LmsOutcomeFooter from '../../components/lms/LmsOutcomeFooter.jsx';
import '../../styles/lms-learning.css';

function nextIncompleteLesson(lessons) {
  return (lessons || []).find((l) => l.progressStatus !== 'completed') || null;
}

export default function CoursePlayerPage({ layout = 'app', basePath = '/parent/lms' }) {
  const Layout = layout === 'dashboard' ? DashboardLayout : AppLayout;
  const { enrollmentId } = useParams();
  const navigate = useNavigate();
  const { tenantPath } = useTenantPath();
  const { toast } = useToast();
  const { config, portalName, school, branding } = usePortalConfig();

  const portalSnapshot = useMemo(
    () => ({
      ...config,
      portalName,
      school: school || config?.school,
      branding: branding || config?.branding,
      courseCertificates: mergeCourseCertificateConfig(config?.courseCertificates),
    }),
    [config, portalName, school, branding],
  );

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [view, setView] = useState('lesson'); // lesson | practice | quiz | results
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  const reload = async () => {
    const data = await lmsApi.myLearningDetail(enrollmentId);
    setDetail(data);
    const lessons = data.lessons || [];
    setActiveLessonId((current) => {
      if (current && lessons.some((l) => l.id === current)) return current;
      const next = nextIncompleteLesson(lessons) || lessons[0];
      return next?.id || null;
    });
    return data;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setMissing(false);
      try {
        const data = await reload();
        if (cancelled) return;
        setDetail(data);
        const lessons = data.lessons || [];
        const next = nextIncompleteLesson(lessons) || lessons[0];
        if (next) setActiveLessonId(next.id);
      } catch (err) {
        if (!cancelled) {
          setMissing(true);
          toast(err?.message || 'Unable to open course.', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [enrollmentId]);

  const lessons = detail?.lessons || [];
  const quizzes = detail?.quizzes || [];
  const enrollment = detail?.enrollment || detail;
  const activeLesson = lessons.find((l) => l.id === activeLessonId) || lessons[0];
  const activeQuiz = quizzes[0];
  const progressPct = Number(enrollment?.progressPct ?? detail?.progressPct ?? 0);
  const title = detail?.title || detail?.courseTitle || enrollment?.courseTitle || 'Course';
  const learnerName = enrollment?.learnerName || detail?.learnerName || '';
  const quizOutcome = enrollmentQuizOutcome(detail);
  const earnedCertificate = hasEarnedCertificate(detail) || hasEarnedCertificate(enrollment);
  const canFinish = canCompleteCourse(detail);
  const completed = (enrollment?.status === 'completed' || progressPct >= 100)
    && quizOutcome.passed !== false;

  const markComplete = async () => {
    if (!activeLesson) return;
    setBusy(true);
    try {
      await lmsApi.updateLessonProgress(activeLesson.id, {
        enrollmentId,
        status: 'completed',
      });
      toast('Lesson completed. Great job!', 'success');
      const data = await reload();
      const next = nextIncompleteLesson(data.lessons || []);
      if (next) {
        setActiveLessonId(next.id);
        setView('lesson');
      } else if ((data.quizzes || [])[0]) {
        setView('practice');
      }
    } catch (err) {
      toast(err?.message || 'Unable to update progress.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const startQuiz = async () => {
    if (!activeQuiz) {
      toast('This course does not have a quiz yet.', 'error');
      return;
    }
    setBusy(true);
    try {
      const data = await lmsApi.startQuizAttempt(activeQuiz.id, { enrollmentId });
      setAttempt(data.attempt || data);
      setAnswers({});
      setQuizResult(null);
      setView('quiz');
    } catch (err) {
      toast(err?.message || 'Unable to start quiz.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitQuiz = async () => {
    if (!activeQuiz || !attempt) return;
    const unanswered = (activeQuiz.questions || []).filter((q) => !answers[q.id]);
    if (unanswered.length) {
      toast('Please answer every question before submitting.', 'error');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        answers: Object.entries(answers).map(([questionId, selectedOptionId]) => ({
          questionId,
          selectedOptionId,
        })),
      };
      const raw = await lmsApi.submitQuizAttempt(activeQuiz.id, attempt.id, payload);
      const result = normalizeQuizSubmitResult(raw, activeQuiz);
      setQuizResult(result);
      setView('results');
      toast(
        result.passed ? 'Great Job! You passed.' : 'Keep Practicing! Try another attempt.',
        result.passed ? 'success' : 'warning',
      );
      await reload();
    } catch (err) {
      toast(err?.message || 'Unable to submit quiz.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const showCertificate = async (cert) => {
    if (!cert) return;
    const merged = mergeCertificateRecords(cert, {
      learnerName: cert.learnerName || enrollment?.learnerName || detail?.learnerName,
      courseTitle: cert.courseTitle || title,
    });
    await openLmsCertificatePreview({
      cert: merged,
      certificateId: merged.id || merged.certificateId,
      portalConfig: portalSnapshot,
      fetchCertificate: (id) => lmsApi.resolveCertificate(id, merged),
      fetchCertificateHtml: (id) => lmsApi.certificateHtml(id),
      onBlocked: () => toast('Pop-up blocked. Allow pop-ups to view the certificate.', 'error'),
      onError: (msg) => toast(msg || 'Certificate unavailable.', 'error'),
    });
  };

  const finishCourse = async () => {
    if (!canCompleteCourse(detail)) {
      toast(
        quizOutcome.passed === false
          ? 'Pass the required quiz before a certificate can be issued.'
          : 'Finish all lessons and pass the required quiz first.',
        'error',
      );
      return;
    }
    setBusy(true);
    try {
      const result = await lmsApi.completeCourse(enrollmentId);
      toast('Course completed! Certificate issued.', 'success');
      setCelebrating(true);
      await reload();
      if (result.certificate) {
        await showCertificate(result.certificate);
      } else if (result.certificateId) {
        await showCertificate({ id: result.certificateId });
      }
    } catch (err) {
      toast(err?.message || 'Finish all lessons and pass the required quiz first.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const openCertificate = async () => {
    if (!earnedCertificate) return;
    const cert = detail?.certificate || (
      enrollment?.certificateId
        ? {
            id: enrollment.certificateId,
            learnerName: enrollment.learnerName,
            courseTitle: title,
            issuedAt: enrollment.completedAt,
          }
        : null
    );
    if (!cert) return;
    await showCertificate(cert);
  };

  if (loading) {
    return (
      <Layout>
        <LoadingState message="Opening Digital Classroom…" />
      </Layout>
    );
  }

  if (missing || !detail) {
    return (
      <Layout>
        <PageTransition>
          <PageHeader
            title="Course not found"
            actions={(
              <Link to={tenantPath(basePath)}>
                <Button variant="secondary"><ArrowLeft size={16} /> Back</Button>
              </Link>
            )}
          />
          <EmptyState
            icon={Sparkles}
            title="This course is unavailable"
            description="It may have been unpublished, or this enrollment is no longer assigned to your child."
          />
        </PageTransition>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageTransition>
        <PageHeader
          title={title}
          subtitle={learnerName ? `Learning as ${learnerName}` : 'Course player'}
          actions={(
            <div className="flex flex-wrap gap-2">
              <Link to={tenantPath(basePath)}>
                <Button variant="secondary"><ArrowLeft size={16} /> Back</Button>
              </Link>
              {earnedCertificate && (
                <Button variant="secondary" onClick={openCertificate}>
                  <Award size={16} /> Certificate
                </Button>
              )}
            </div>
          )}
        />

        <div className="lms-hero">
          <div>
            <p className="lms-hero__title">
              {quizOutcome.passed === false
                ? 'Keep Practicing!'
                : completed
                  ? 'Course complete — well done!'
                  : 'Keep going, you\'re doing great'}
            </p>
            <p className="lms-hero__meta">
              {lessons.filter((l) => l.progressStatus === 'completed').length} of {lessons.length} lessons
              {activeQuiz
                ? ` · Quiz ${activeQuiz.passed ? 'passed' : quizOutcome.attempted ? 'not passed' : 'ready'}`
                : ''}
            </p>
          </div>
          <div className="lms-hero__pct">{progressPct}%</div>
        </div>

        {quizOutcome.attempted && (
          <div className="mb-4 rounded-2xl border border-[#e4e7ec] bg-white px-4 py-3">
            <LmsOutcomeFooter outcome={quizOutcome} />
          </div>
        )}

        {celebrating && earnedCertificate && (
          <div className="lms-celebrate mb-4">
            <p className="text-xl font-extrabold text-[#0b1b33]">Achievement unlocked!</p>
            <p className="text-sm text-[#475467]">You finished the course. Your certificate is ready.</p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-[#e4e7ec] bg-white p-3">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
              Lessons · {progressPct}%
            </p>
            <div className="space-y-1">
              {lessons.length === 0 && (
                <p className="px-2 text-sm text-[#667085]">No lessons in this course yet.</p>
              )}
              {lessons.map((lesson) => {
                const done = lesson.progressStatus === 'completed';
                const active = lesson.id === activeLesson?.id && view === 'lesson';
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => {
                      setView('lesson');
                      setActiveLessonId(lesson.id);
                    }}
                    className={`flex w-full min-h-[44px] items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${
                      active ? 'bg-[#0b1b33] text-white' : 'hover:bg-[#f8fafc] text-[#0b1b33]'
                    }`}
                  >
                    {done
                      ? <CheckCircle2 size={16} className={active ? 'text-[#f5b400]' : 'text-[#12b76a]'} />
                      : <Circle size={16} className={active ? 'text-white/70' : 'text-[#d0d5dd]'} />}
                    <span className="line-clamp-2">{lesson.title}</span>
                  </button>
                );
              })}
            </div>
            {activeQuiz && (
              <>
                <button
                  type="button"
                  onClick={() => setView('practice')}
                  className={`mt-3 flex w-full min-h-[44px] items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${
                    view === 'practice' ? 'bg-[#fff8e6] text-[#0b1b33]' : 'hover:bg-[#fff8e6] text-[#0b1b33]'
                  }`}
                >
                  <Sparkles size={16} /> Practice
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (quizResult) setView('results');
                    else startQuiz();
                  }}
                  className={`mt-1 flex w-full min-h-[44px] items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${
                    view === 'quiz' || view === 'results' ? 'bg-[#f5b400] text-[#0b1b33]' : 'hover:bg-[#fff8e6] text-[#0b1b33]'
                  }`}
                >
                  <HelpCircle size={16} />
                  {activeQuiz.title || 'Quiz'}
                  {activeQuiz.passed ? ' · Passed' : quizOutcome.attempted ? ' · Failed' : ''}
                </button>
              </>
            )}
            {canFinish && (
              <Button className="mt-3 w-full lms-btn-lg" onClick={finishCourse} loading={busy}>
                <Award size={16} /> Complete & get certificate
              </Button>
            )}
            {quizOutcome.attempted && !earnedCertificate && (
              <div className="mt-3 px-1">
                <LmsOutcomeFooter outcome={quizOutcome} />
              </div>
            )}
          </aside>

          <section className="rounded-2xl border border-[#e4e7ec] bg-white p-5">
            {view === 'results' && quizResult ? (
              <QuizResultsPanel
                result={quizResult}
                quiz={activeQuiz}
                retrying={busy}
                onRetry={startQuiz}
                onBackToLessons={() => {
                  const next = nextIncompleteLesson(lessons);
                  if (next) setActiveLessonId(next.id);
                  setView('lesson');
                }}
              />
            ) : view === 'quiz' && activeQuiz ? (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-[#0b1b33]">{activeQuiz.title}</h2>
                <p className="text-sm text-[#667085]">
                  Pass mark {activeQuiz.passPercentage ?? activeQuiz.passingPercentage ?? 60}%
                  {activeQuiz.maxAttempts > 0 ? ` · Max ${activeQuiz.maxAttempts} attempts` : ' · Unlimited retries'}
                </p>
                {(activeQuiz.questions || []).length === 0 ? (
                  <EmptyState
                    title="Quiz has no questions"
                    description="Ask the teacher to add questions in Digital Classroom."
                  />
                ) : (
                  (activeQuiz.questions || []).map((question, index) => (
                    <div key={question.id} className="rounded-xl border border-[#eef0f4] p-4">
                      <p className="mb-3 font-medium text-[#0b1b33]">
                        {index + 1}. {questionPrompt(question)}
                      </p>
                      <div className="space-y-2">
                        {(question.options || []).map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={`lms-quiz-option ${answers[question.id] === option.id ? 'is-selected' : ''}`}
                            onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option.id }))}
                          >
                            {optionLabel(option)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
                <Button className="lms-btn-lg" onClick={submitQuiz} loading={busy} disabled={!attempt}>
                  Submit quiz
                </Button>
              </div>
            ) : view === 'practice' ? (
              <LessonPractice
                lesson={activeLesson}
                quiz={activeQuiz}
                onStartQuiz={startQuiz}
              />
            ) : activeLesson ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#98a2b3]">{activeLesson.type}</p>
                    <h2 className="text-xl font-semibold text-[#0b1b33]">{activeLesson.title}</h2>
                  </div>
                  {activeLesson.progressStatus === 'completed'
                    ? <CheckCircle2 className="text-[#12b76a]" />
                    : null}
                </div>

                <LmsLessonMediaPlayer
                  lesson={activeLesson}
                  enrollmentId={enrollmentId}
                />

                {activeLesson.content && (
                  <div className="prose max-w-none whitespace-pre-wrap text-sm text-[#475467]">
                    {activeLesson.content}
                  </div>
                )}

                {!activeLesson.content
                  && !activeLesson.resourceUrl
                  && !activeLesson.hasFile
                  && activeLesson.type !== 'video'
                  && activeLesson.type !== 'audio'
                  && activeLesson.type !== 'document' && (
                  <p className="text-sm text-[#98a2b3]">No content attached to this lesson yet.</p>
                )}
                {activeLesson.type === 'document'
                  && !activeLesson.hasFile
                  && !activeLesson.resourceUrl
                  && !activeLesson.content && (
                  <p className="text-sm text-[#98a2b3]">No document uploaded for this lesson yet.</p>
                )}

                {activeLesson.progressStatus !== 'completed' && (
                  <Button className="lms-btn-lg" onClick={markComplete} loading={busy}>
                    <Play size={16} /> Mark lesson complete
                  </Button>
                )}

                {activeLesson.progressStatus === 'completed' && nextIncompleteLesson(lessons) && (
                  <Button
                    className="lms-btn-lg"
                    variant="secondary"
                    onClick={() => {
                      const next = nextIncompleteLesson(lessons);
                      if (next) setActiveLessonId(next.id);
                    }}
                  >
                    Continue to next lesson
                  </Button>
                )}

                <LessonPractice
                  lesson={activeLesson}
                  quiz={null}
                />
              </div>
            ) : (
              <EmptyState
                title="No lessons in this course"
                description="Lessons will appear when the teacher publishes them."
              />
            )}
          </section>
        </div>
      </PageTransition>
    </Layout>
  );
}
