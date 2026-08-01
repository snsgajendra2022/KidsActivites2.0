import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Award, CheckCircle2, Circle, HelpCircle, Play,
} from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { LoadingState, PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import LmsLessonMediaPlayer from '../../components/lms/LmsLessonMediaPlayer.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { lmsApi } from '../../services/lmsService.js';

export default function CoursePlayerPage({ layout = 'app', basePath = '/parent/lms' }) {
  const Layout = layout === 'dashboard' ? DashboardLayout : AppLayout;
  const { enrollmentId } = useParams();
  const navigate = useNavigate();
  const { tenantPath } = useTenantPath();
  const { toast } = useToast();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [quizMode, setQuizMode] = useState(false);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const data = await lmsApi.myLearningDetail(enrollmentId);
    setDetail(data);
    const lessons = data.lessons || [];
    if (!activeLessonId && lessons.length) {
      const next = lessons.find((l) => l.progressStatus !== 'completed') || lessons[0];
      setActiveLessonId(next.id);
    }
    return data;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await reload();
        if (cancelled) return;
        setDetail(data);
      } catch (err) {
        if (!cancelled) {
          toast(err?.message || 'Unable to open course.', 'error');
          navigate(tenantPath(basePath));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [enrollmentId]);

  const lessons = detail?.lessons || [];
  const quizzes = detail?.quizzes || [];
  const enrollment = detail?.enrollment;
  const activeLesson = lessons.find((l) => l.id === activeLessonId) || lessons[0];
  const activeQuiz = quizzes[0];
  const completion = detail?.completion || enrollment?.completion || {};

  const markComplete = async () => {
    if (!activeLesson) return;
    setBusy(true);
    try {
      await lmsApi.updateLessonProgress(activeLesson.id, {
        enrollmentId,
        status: 'completed',
      });
      toast('Lesson completed.', 'success');
      const data = await reload();
      const next = (data.lessons || []).find((l) => l.progressStatus !== 'completed');
      if (next) setActiveLessonId(next.id);
    } catch (err) {
      toast(err?.message || 'Unable to update progress.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const startQuiz = async () => {
    if (!activeQuiz) return;
    setBusy(true);
    try {
      const data = await lmsApi.startQuizAttempt(activeQuiz.id, { enrollmentId });
      setAttempt(data.attempt);
      setAnswers({});
      setQuizMode(true);
    } catch (err) {
      toast(err?.message || 'Unable to start quiz.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitQuiz = async () => {
    if (!activeQuiz || !attempt) return;
    setBusy(true);
    try {
      const payload = {
        answers: Object.entries(answers).map(([questionId, selectedOptionId]) => ({
          questionId,
          selectedOptionId,
        })),
      };
      const result = await lmsApi.submitQuizAttempt(activeQuiz.id, attempt.id, payload);
      toast(result.passed ? 'Quiz passed!' : 'Quiz submitted. Try again if attempts remain.', result.passed ? 'success' : 'warning');
      setQuizMode(false);
      setAttempt(null);
      await reload();
    } catch (err) {
      toast(err?.message || 'Unable to submit quiz.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const finishCourse = async () => {
    setBusy(true);
    try {
      const result = await lmsApi.completeCourse(enrollmentId);
      toast('Course completed! Certificate issued.', 'success');
      await reload();
      if (result.certificate?.id) {
        const html = await lmsApi.certificateHtml(result.certificate.id);
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(html.renderedHtml || '');
          win.document.close();
        }
      }
    } catch (err) {
      toast(err?.message || 'Unable to complete course yet.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const openCertificate = async () => {
    const certId = detail?.certificate?.id || enrollment?.certificateId;
    if (!certId) return;
    try {
      const data = await lmsApi.certificateHtml(certId);
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(data.renderedHtml || '');
        win.document.close();
      }
    } catch (err) {
      toast(err?.message || 'Certificate unavailable.', 'error');
    }
  };

  if (loading || !detail) {
    return (
      <Layout>
        <LoadingState label="Opening Digital Classroom…" />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageTransition>
        <PageHeader
          title={detail.title || 'Course'}
          subtitle={enrollment?.learnerName ? `Learning as ${enrollment.learnerName}` : 'Course player'}
          actions={(
            <div className="flex flex-wrap gap-2">
              <Link to={tenantPath(basePath)}>
                <Button variant="secondary"><ArrowLeft size={16} /> Back</Button>
              </Link>
              {(detail.certificate || enrollment?.certificateId) && (
                <Button variant="secondary" onClick={openCertificate}>
                  <Award size={16} /> Certificate
                </Button>
              )}
            </div>
          )}
        />

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-[#e4e7ec] bg-white p-3">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
              Lessons · {enrollment?.progressPct || 0}%
            </p>
            <div className="space-y-1">
              {lessons.map((lesson) => {
                const done = lesson.progressStatus === 'completed';
                const active = lesson.id === activeLesson?.id && !quizMode;
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => {
                      setQuizMode(false);
                      setActiveLessonId(lesson.id);
                    }}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${
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
              <button
                type="button"
                onClick={() => {
                  setQuizMode(true);
                  if (!attempt) startQuiz();
                }}
                className={`mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${
                  quizMode ? 'bg-[#f5b400] text-[#0b1b33]' : 'hover:bg-[#fff8e6] text-[#0b1b33]'
                }`}
              >
                <HelpCircle size={16} />
                {activeQuiz.title}
                {activeQuiz.passed ? ' · Passed' : ''}
              </button>
            )}
            {completion.canComplete && enrollment?.status !== 'completed' && (
              <Button className="mt-3 w-full" onClick={finishCourse} loading={busy}>
                <Award size={16} /> Complete & get certificate
              </Button>
            )}
          </aside>

          <section className="rounded-2xl border border-[#e4e7ec] bg-white p-5">
            {quizMode && activeQuiz ? (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-[#0b1b33]">{activeQuiz.title}</h2>
                <p className="text-sm text-[#667085]">
                  Pass mark {activeQuiz.passPercentage}%
                  {activeQuiz.maxAttempts > 0 ? ` · Max ${activeQuiz.maxAttempts} attempts` : ''}
                </p>
                {(activeQuiz.questions || []).map((question, index) => (
                  <div key={question.id} className="rounded-xl border border-[#eef0f4] p-4">
                    <p className="mb-3 font-medium text-[#0b1b33]">
                      {index + 1}. {question.question}
                    </p>
                    <div className="space-y-2">
                      {(question.options || []).map((option) => (
                        <label key={option.id} className="flex items-center gap-2 text-sm text-[#475467]">
                          <input
                            type="radio"
                            name={`q-${question.id}`}
                            checked={answers[question.id] === option.id}
                            onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: option.id }))}
                          />
                          {option.text}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <Button onClick={submitQuiz} loading={busy} disabled={!attempt}>
                  Submit quiz
                </Button>
              </div>
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
                  <Button onClick={markComplete} loading={busy}>
                    <Play size={16} /> Mark lesson complete
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#667085]">No lessons in this course.</p>
            )}
          </section>
        </div>
      </PageTransition>
    </Layout>
  );
}
