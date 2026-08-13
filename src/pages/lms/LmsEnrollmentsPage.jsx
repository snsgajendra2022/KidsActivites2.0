import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, Plus, Trash2, Users } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { EmptyState, LoadingState, PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Modal, { ConfirmModal } from '../../components/ui/Modal.jsx';
import { ResponsiveDataTable, TableActionButton } from '../../components/ui/DataTable.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { lmsApi } from '../../services/lmsService.js';
import { loadClassOptions, loadStudentOptions } from '../../services/schoolModules/relationshipOptions.js';
import { enrollmentQuizOutcome } from '../../utils/lmsEnrollmentOutcome.js';

export default function LmsEnrollmentsPage({ layout = 'dashboard', basePath = '/admin/lms' }) {
  const Layout = layout === 'app' ? AppLayout : DashboardLayout;
  const { tenantPath } = useTenantPath();
  const { toast } = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    courseId: '',
    mode: 'student',
    classId: '',
    studentId: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [enrollments, courseData, classOpts] = await Promise.all([
        lmsApi.listEnrollments(),
        lmsApi.listCourses(),
        loadClassOptions(user),
      ]);
      setItems(enrollments.items || []);
      setCourses((courseData.items || []).filter((c) => c.status === 'published'));
      setClasses(classOpts || []);
    } catch (err) {
      toast(err?.message || 'Unable to load enrollments.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!form.classId) {
      setStudents([]);
      return;
    }
    loadStudentOptions(user, { classId: form.classId })
      .then(setStudents)
      .catch(() => setStudents([]));
  }, [form.classId, user]);

  const courseOptions = useMemo(
    () => courses.map((c) => ({ value: c.id, label: c.title })),
    [courses],
  );

  const submit = async () => {
    if (!form.courseId) {
      toast('Select a course.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (form.mode === 'class') {
        if (!form.classId) {
          toast('Select a class.', 'error');
          setSaving(false);
          return;
        }
        const result = await lmsApi.enrollClass({
          courseId: form.courseId,
          classId: form.classId,
        });
        toast(`Enrolled ${result.created || 0} students.`, 'success');
      } else {
        if (!form.studentId) {
          toast('Select a student.', 'error');
          setSaving(false);
          return;
        }
        await lmsApi.createEnrollment({
          courseId: form.courseId,
          studentId: form.studentId,
        });
        toast('Student enrolled.', 'success');
      }
      setOpen(false);
      setForm({ courseId: '', mode: 'student', classId: '', studentId: '' });
      await load();
    } catch (err) {
      toast(err?.message || 'Enrollment failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteId) return;
    try {
      await lmsApi.deleteEnrollment(deleteId);
      toast('Enrollment removed.', 'success');
      setDeleteId(null);
      await load();
    } catch (err) {
      toast(err?.message || 'Delete failed.', 'error');
    }
  };

  return (
    <Layout>
      <PageTransition>
        <PageHeader
          title="Learner progress"
          subtitle="Enrollments, course progress, and quiz results from the LMS APIs."
          actions={(
            <div className="flex flex-wrap gap-2">
              <Link to={tenantPath(basePath)}>
                <Button variant="secondary"><ArrowLeft size={16} /> Courses</Button>
              </Link>
              <Button onClick={() => setOpen(true)}><Plus size={16} /> Enroll</Button>
            </div>
          )}
        />

        {loading ? (
          <LoadingState message="Loading enrollments…" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No enrollments yet"
            description="Enroll students into a published Digital Classroom course."
            action={<Button onClick={() => setOpen(true)}><Plus size={16} /> Enroll</Button>}
          />
        ) : (
          <ResponsiveDataTable
            columns={[
              { key: 'learnerName', label: 'Learner' },
              { key: 'courseTitle', label: 'Course' },
              { key: 'className', label: 'Class' },
              {
                key: 'progressPct',
                label: 'Progress',
                render: (row) => `${row.progressPct || 0}%`,
              },
              {
                key: 'status',
                label: 'Status',
                render: (row) => <StatusBadge status={row.status} />,
              },
              {
                key: 'quiz',
                label: 'Quiz',
                render: (row) => {
                  const outcome = enrollmentQuizOutcome(row);
                  if (!outcome.attempted && outcome.passed == null) return '—';
                  const pct = outcome.percentage != null ? `${Math.round(Number(outcome.percentage))}%` : '';
                  const label = outcome.technical || (outcome.passed ? 'PASS' : 'FAIL');
                  return [pct, label].filter(Boolean).join(' · ');
                },
              },
            ]}
            data={items}
            minWidth={720}
            renderActions={(row) => (
              <div className="flex gap-1">
                <Link to={tenantPath(`${basePath}/enrollments/${row.id}`)}>
                  <TableActionButton>
                    <Eye size={14} />
                  </TableActionButton>
                </Link>
                <TableActionButton variant="danger" onClick={() => setDeleteId(row.id)}>
                  <Trash2 size={14} />
                </TableActionButton>
              </div>
            )}
          />
        )}

        <Modal open={open} onClose={() => setOpen(false)} title="Enroll learners">
          <div className="space-y-4">
            <Select
              label="Course"
              required
              value={form.courseId}
              options={[{ value: '', label: 'Select course' }, ...courseOptions]}
              onChange={(e) => setForm((p) => ({ ...p, courseId: e.target.value }))}
            />
            <Select
              label="Enroll"
              value={form.mode}
              options={[
                { value: 'student', label: 'One student' },
                { value: 'class', label: 'Entire class' },
              ]}
              onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value, studentId: '' }))}
            />
            <Select
              label="Class"
              required
              value={form.classId}
              options={[{ value: '', label: 'Select class' }, ...classes]}
              onChange={(e) => setForm((p) => ({ ...p, classId: e.target.value, studentId: '' }))}
            />
            {form.mode === 'student' && (
              <Select
                label="Student"
                required
                value={form.studentId}
                options={[{ value: '', label: 'Select student' }, ...students]}
                onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))}
              />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} loading={saving}>Enroll</Button>
            </div>
          </div>
        </Modal>

        <ConfirmModal
          open={Boolean(deleteId)}
          title="Remove enrollment?"
          message="Progress and quiz attempts for this enrollment will be removed."
          confirmText="Remove"
          confirmVariant="danger"
          onConfirm={remove}
          onClose={() => setDeleteId(null)}
        />
      </PageTransition>
    </Layout>
  );
}
