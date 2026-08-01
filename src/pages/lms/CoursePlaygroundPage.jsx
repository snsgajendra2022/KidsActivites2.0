import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Circle, FileText, HelpCircle, Video } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { LoadingState, PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import LmsLessonMediaPlayer from '../../components/lms/LmsLessonMediaPlayer.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { lmsApi } from '../../services/lmsService.js';

/**
 * Admin/teacher lesson playground — same media player as parents, no enrollment/progress.
 */
export default function CoursePlaygroundPage({ layout = 'dashboard', basePath = '/admin/lms' }) {
  const Layout = layout === 'app' ? AppLayout : DashboardLayout;
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { tenantPath } = useTenantPath();
  const { toast } = useToast();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeLessonId, setActiveLessonId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await lmsApi.getCourse(courseId);
        if (cancelled) return;
        setCourse(data);
        const lessons = data.lessons || [];
        if (lessons.length) setActiveLessonId(lessons[0].id);
      } catch (err) {
        if (!cancelled) {
          toast(err?.message || 'Unable to open playground.', 'error');
          navigate(tenantPath(`${basePath}/courses/${courseId}`));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [courseId]);

  const lessons = course?.lessons || [];
  const activeLesson = lessons.find((l) => l.id === activeLessonId) || lessons[0];

  if (loading || !course) {
    return (
      <Layout>
        <LoadingState label="Opening lesson preview…" />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageTransition>
        <PageHeader
          title={course.title || 'Course preview'}
          subtitle="Playground — media only, progress is not saved."
          actions={(
            <Link to={tenantPath(`${basePath}/courses/${courseId}`)}>
              <Button variant="secondary"><ArrowLeft size={16} /> Back to editor</Button>
            </Link>
          )}
        />

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-[#e4e7ec] bg-white p-3">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
              Lessons
            </p>
            <div className="space-y-1">
              {lessons.map((lesson) => {
                const active = lesson.id === activeLesson?.id;
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setActiveLessonId(lesson.id)}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${
                      active ? 'bg-[#0b1b33] text-white' : 'hover:bg-[#f8fafc] text-[#0b1b33]'
                    }`}
                  >
                    {lesson.type === 'video' ? <Video size={16} />
                      : lesson.type === 'document' ? <FileText size={16} />
                        : <Circle size={16} />}
                    <span className="line-clamp-2">{lesson.title}</span>
                  </button>
                );
              })}
            </div>
            {(course.quizzes || []).length > 0 && (
              <p className="mt-3 flex items-center gap-2 px-3 text-xs text-[#667085]">
                <HelpCircle size={14} /> Quizzes are hidden in playground preview.
              </p>
            )}
          </aside>

          <section className="rounded-2xl border border-[#e4e7ec] bg-white p-5">
            {activeLesson ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#98a2b3]">{activeLesson.type}</p>
                  <h2 className="text-xl font-semibold text-[#0b1b33]">{activeLesson.title}</h2>
                </div>
                <LmsLessonMediaPlayer lesson={activeLesson} readOnly />
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
