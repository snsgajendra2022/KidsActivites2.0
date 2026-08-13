import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Plus, Sparkles, Archive, Send, Trash2, Users, Award,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { EmptyState, LoadingState, PageHeader, SearchField } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { ConfirmModal } from '../../components/ui/Modal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { lmsApi } from '../../services/lmsService.js';

export default function LmsCoursesPage({ layout = 'dashboard', basePath = '/admin/lms' }) {
  const Layout = layout === 'app' ? AppLayout : DashboardLayout;
  const { tenantPath } = useTenantPath();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await lmsApi.listCourses();
      setItems(data.items || []);
    } catch (err) {
      toast(err?.message || 'Unable to load courses.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.title, item.subject, item.className, item.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q));
  }, [items, search]);

  const publish = async (id) => {
    setBusyId(id);
    try {
      await lmsApi.publishCourse(id);
      toast('Course published.', 'success');
      await load();
    } catch (err) {
      toast(err?.message || 'Publish failed.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const archive = async (id) => {
    setBusyId(id);
    try {
      await lmsApi.archiveCourse(id);
      toast('Course archived.', 'success');
      await load();
    } catch (err) {
      toast(err?.message || 'Archive failed.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!deleteId) return;
    setBusyId(deleteId);
    try {
      await lmsApi.deleteCourse(deleteId);
      toast('Course deleted.', 'success');
      setDeleteId(null);
      await load();
    } catch (err) {
      toast(err?.message || 'Delete failed.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Layout>
      <PageTransition>
        <PageHeader
          title="Digital Classroom"
          subtitle="Create courses, lessons, and quizzes for your classes."
          actions={(
            <div className="flex flex-wrap gap-2">
              <Link to={tenantPath(`${basePath}/enrollments`)}>
                <Button variant="secondary"><Users size={16} /> Progress</Button>
              </Link>
              <Link to={tenantPath(`${basePath}/certificates`)}>
                <Button variant="secondary"><Award size={16} /> Certificates</Button>
              </Link>
              <Link to={tenantPath(`${basePath}/courses/new`)}>
                <Button><Plus size={16} /> New Course</Button>
              </Link>
            </div>
          )}
        />

        <div className="mb-4 flex items-center gap-3">
          <SearchField
            className="flex-1"
            maxWidthClass="max-w-md"
            placeholder="Search courses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <LoadingState message="Loading courses…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No courses yet"
            description="Create your first Digital Classroom course with lessons and a quiz."
            action={(
              <Link to={tenantPath(`${basePath}/courses/new`)}>
                <Button><Plus size={16} /> New Course</Button>
              </Link>
            )}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((course) => (
              <article
                key={course.id}
                className="overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-sm"
              >
                <div className="flex h-28 items-center justify-center bg-gradient-to-br from-[#0b1b33] to-[#16365f]">
                  <BookOpen size={36} className="text-[#f5b400]" />
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-[#0b1b33]">{course.title}</h3>
                      <p className="text-xs text-[#667085]">
                        {[course.subject, course.className].filter(Boolean).join(' · ') || 'All classes'}
                      </p>
                    </div>
                    <StatusBadge status={course.status} />
                  </div>
                  <p className="line-clamp-2 text-sm text-[#475467]">
                    {course.description || 'No description'}
                  </p>
                  <p className="text-xs text-[#98a2b3]">
                    {course.lessonCount || 0} lessons · {course.quizCount || 0} quizzes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link to={tenantPath(`${basePath}/courses/${course.id}`)}>
                      <Button size="sm" variant="secondary">Edit</Button>
                    </Link>
                    {course.status !== 'published' && (
                      <Button
                        size="sm"
                        onClick={() => publish(course.id)}
                        disabled={busyId === course.id}
                      >
                        <Send size={14} /> Publish
                      </Button>
                    )}
                    {course.status === 'published' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => archive(course.id)}
                        disabled={busyId === course.id}
                      >
                        <Archive size={14} /> Archive
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setDeleteId(course.id)}
                      disabled={busyId === course.id}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <ConfirmModal
          open={Boolean(deleteId)}
          title="Delete course?"
          message="This removes the course, lessons, quizzes, and related enrollments."
          confirmText="Delete"
          confirmVariant="danger"
          onConfirm={remove}
          onClose={() => setDeleteId(null)}
        />
      </PageTransition>
    </Layout>
  );
}
