import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Award, CheckCircle2, HelpCircle } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { EmptyState, LoadingState, PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { lmsApi } from '../../services/lmsService.js';
import { optionLabel, questionPrompt, quizPercentage, quizPassingPercentage } from '../../utils/lmsQuizScoring.js';
import { enrollmentQuizOutcome, hasEarnedCertificate } from '../../utils/lmsEnrollmentOutcome.js';
import LmsOutcomeFooter from '../../components/lms/LmsOutcomeFooter.jsx';
import '../../styles/lms-learning.css';

/**
 * Teacher/admin inspector: enrollment progress + quiz results + course answer key.
 * Correct answers come from GET /lms/courses/{id} quiz JSON — never guessed.
 */
export default function LmsEnrollmentProgressPage({
  layout = 'dashboard',
  basePath = '/admin/lms',
}) {
  const Layout = layout === 'app' ? AppLayout : DashboardLayout;
  const { enrollmentId } = useParams();
  const navigate = useNavigate();
  const { tenantPath } = useTenantPath();
  const { toast } = useToast();
  const [detail, setDetail] = useState(null);
  const [course, setCourse] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const enrollment = await lmsApi.getEnrollment(enrollmentId);
        if (cancelled) return;
        setDetail(enrollment);
        const courseId = enrollment.courseId || enrollment.course?.id;
        let courseData = null;
        if (courseId) {
          try {
            courseData = await lmsApi.getCourse(courseId);
            if (!cancelled) setCourse(courseData);
          } catch {
            if (!cancelled) setCourse(null);
          }
        }
        const quizId = (enrollment.quizzes || [])[0]?.id || (courseData?.quizzes || [])[0]?.id;
        if (quizId) {
          try {
            const data = await lmsApi.listQuizAttempts(quizId, { enrollmentId });
            if (!cancelled) setAttempts(data.items || []);
          } catch {
            if (!cancelled) setAttempts(enrollment.quizzes?.[0]?.attempts || []);
          }
        }
      } catch (err) {
        if (!cancelled) {
          toast(err?.message || 'Unable to load learner progress.', 'error');
          navigate(tenantPath(`${basePath}/enrollments`));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [enrollmentId]);

  const lessons = detail?.lessons || [];
  const quizzes = detail?.quizzes || course?.quizzes || [];
  const staffQuiz = (course?.quizzes || [])[0] || quizzes[0];
  const attemptRows = useMemo(() => {
    if (attempts.length) return attempts;
    return staffQuiz?.attempts || quizzes[0]?.attempts || [];
  }, [attempts, staffQuiz, quizzes]);

  if (loading) {
    return (
      <Layout>
        <LoadingState message="Loading learner progress…" />
      </Layout>
    );
  }

  if (!detail) {
    return (
      <Layout>
        <EmptyState title="Enrollment not found" description="This learner enrollment is missing or you do not have access." />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageTransition>
        <PageHeader
          title={detail.learnerName || 'Learner progress'}
          subtitle={detail.courseTitle || course?.title || 'Course'}
          actions={(
            <Link to={tenantPath(`${basePath}/enrollments`)}>
              <Button variant="secondary"><ArrowLeft size={16} /> Enrollments</Button>
            </Link>
          )}
        />

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <StatusBadge status={detail.status} />
          <span className="text-sm font-semibold text-[#0b1b33]">{detail.progressPct || 0}% complete</span>
        </div>
        <div className="mb-4 rounded-2xl border border-[#e4e7ec] bg-white px-4 py-3">
          <LmsOutcomeFooter
            outcome={enrollmentQuizOutcome(detail)}
            emptyLabel="No quiz attempt yet"
          />
        </div>

        <section className="mb-4 rounded-2xl border border-[#e4e7ec] bg-white p-4">
          <h2 className="mb-3 font-semibold text-[#0b1b33]">Lessons</h2>
          {lessons.length === 0 ? (
            <p className="text-sm text-[#667085]">No lesson progress on this enrollment yet.</p>
          ) : (
            <ul className="space-y-2">
              {lessons.map((lesson) => (
                <li key={lesson.id} className="flex items-center gap-2 text-sm">
                  {lesson.progressStatus === 'completed'
                    ? <CheckCircle2 size={16} className="text-[#12b76a]" />
                    : <span className="h-4 w-4 rounded-full border border-[#d0d5dd]" />}
                  <span>{lesson.title}</span>
                  <span className="text-xs text-[#98a2b3]">{lesson.progressStatus || 'not started'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-4 rounded-2xl border border-[#e4e7ec] bg-white p-4">
          <h2 className="mb-3 font-semibold text-[#0b1b33]">Quiz results</h2>
          {attemptRows.length === 0 ? (
            <p className="text-sm text-[#667085]">No quiz attempts yet.</p>
          ) : (
            <div className="space-y-2">
              {attemptRows.map((attempt, idx) => {
                const quiz = staffQuiz || quizzes[0];
                const pct = quizPercentage(attempt, quiz);
                const passMark = quizPassingPercentage(quiz, attempt);
                const passed = typeof attempt.passed === 'boolean' ? attempt.passed : pct >= passMark;
                return (
                  <div key={attempt.id || idx} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#eef0f4] px-3 py-2 text-sm">
                    <span>Attempt {attempt.attemptNumber || idx + 1}</span>
                    <span>{pct}% {passed ? '· PASS' : '· FAIL'}</span>
                    <span className="text-xs text-[#98a2b3]">Pass mark {passMark}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {staffQuiz?.questions?.length > 0 && (
          <section className="rounded-2xl border border-[#e4e7ec] bg-white p-4">
            <h2 className="mb-1 flex items-center gap-2 font-semibold text-[#0b1b33]">
              <HelpCircle size={18} /> Answer key
            </h2>
            <p className="mb-3 text-xs text-[#667085]">
              Correct options come from the course quiz on the API — not guessed.
            </p>
            <div className="space-y-3">
              {staffQuiz.questions.map((q, index) => {
                const correct = (q.options || []).filter((o) => o.correct === true);
                return (
                  <div key={q.id || index} className="rounded-xl bg-[#f8fafc] p-3 text-sm">
                    <p className="font-medium text-[#0b1b33]">{index + 1}. {questionPrompt(q)}</p>
                    {correct.length ? (
                      <p className="mt-1 text-[#027a48]">
                        {correct.map((o) => optionLabel(o)).join(', ')}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-[#98a2b3]">No correct flag on this question in the API payload.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {hasEarnedCertificate(detail) && (
          <div className="mt-4">
            <Link to={tenantPath(`${basePath}/certificates`)}>
              <Button variant="secondary"><Award size={16} /> Course certificates</Button>
            </Link>
          </div>
        )}
      </PageTransition>
    </Layout>
  );
}
