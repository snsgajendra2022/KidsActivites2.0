import { useCallback, useEffect, useMemo, useState } from 'react';
import { GraduationCap, Plus } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { EmptyState } from '../../components/ui/index.jsx';
import {
  ResponsiveDataTable,
  TableActionButton,
} from '../../components/ui/DataTable.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal, { ConfirmModal } from '../../components/ui/Modal.jsx';
import {
  listTeachers,
  createTeacher,
  updateTeacher,
  deactivateTeacher,
  assignTeacherClasses,
  getAssignableClassOptions,
} from '../../services/teacherService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ROLES } from '../../constants/roles.js';
import '../../styles/admin-users.css';

const EMPTY_FORM = {
  name: '',
  email: '',
  mobile: '',
  employeeId: '',
  subjects: '',
};

const COLUMNS = [
  { key: 'name', label: 'Teacher Name', primary: true },
  { key: 'email', label: 'Email' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'employeeId', label: 'Employee ID' },
  {
    label: 'Classes',
    render: (row) => (row.classesAssigned?.length
      ? row.classesAssigned.join(', ')
      : '—'),
  },
  {
    label: 'Status',
    badge: true,
    render: (row) => (
      <span className={`admin-badge ${row.status === 'active' ? 'admin-badge--success' : 'admin-badge--muted'}`}>
        {row.status === 'active' ? 'Active' : 'Inactive'}
      </span>
    ),
  },
  { key: 'schoolName', label: 'School' },
];

export default function AdminTeachers() {
  const { user } = useAuth();
  const { activeSchoolId, school, isPlatformAdmin } = usePortalConfig();
  const { toast } = useToast();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);
  const [classSelection, setClassSelection] = useState([]);
  const [tempPassword, setTempPassword] = useState(null);
  const [classOptions, setClassOptions] = useState([]);

  const schoolId = user?.role === ROLES.SUPER_ADMIN
    ? activeSchoolId
    : (user?.schoolId || activeSchoolId);

  useEffect(() => {
    getAssignableClassOptions().then(setClassOptions).catch(() => setClassOptions([]));
  }, []);

  const loadTeachers = useCallback(() => {
    if (!schoolId) return Promise.resolve();
    setLoading(true);
    return listTeachers({ schoolId, search, status: statusFilter }, user)
      .then(setTeachers)
      .finally(() => setLoading(false));
  }, [user, schoolId, search, statusFilter]);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  const closeModal = () => {
    setModal(null);
    setForm(EMPTY_FORM);
    setSelected(null);
    setClassSelection([]);
    setTempPassword(null);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal('create');
  };

  const openEdit = (teacher) => {
    setSelected(teacher);
    setForm({
      name: teacher.name || '',
      email: teacher.email || '',
      mobile: teacher.mobile || '',
      employeeId: teacher.employeeId || '',
      subjects: (teacher.subjects || []).join(', '),
    });
    setModal('edit');
  };

  const openAssign = (teacher) => {
    setSelected(teacher);
    setClassSelection(teacher.classesAssigned || []);
    setModal('assign');
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const result = await createTeacher({
        schoolId,
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim() || undefined,
        employeeId: form.employeeId.trim() || undefined,
        subjects: form.subjects.split(',').map((s) => s.trim()).filter(Boolean),
      }, user);
      setTempPassword(result.tempPassword);
      await loadTeachers();
      toast('Teacher account created.', 'success');
      setModal('created');
    } catch (err) {
      toast(err.message || 'Failed to create teacher.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await updateTeacher(selected.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim() || null,
        employeeId: form.employeeId.trim() || null,
        subjects: form.subjects.split(',').map((s) => s.trim()).filter(Boolean),
      }, user);
      await loadTeachers();
      toast('Teacher updated.', 'success');
      closeModal();
    } catch (err) {
      toast(err.message || 'Failed to update teacher.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    setSaving(true);
    try {
      await deactivateTeacher(selected.id, user);
      await loadTeachers();
      toast('Teacher deactivated.', 'success');
      closeModal();
    } catch (err) {
      toast(err.message || 'Failed to deactivate teacher.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignClasses = async () => {
    setSaving(true);
    try {
      await assignTeacherClasses(selected.id, classSelection, user);
      await loadTeachers();
      toast('Classes assigned.', 'success');
      closeModal();
    } catch (err) {
      toast(err.message || 'Failed to assign classes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleClass = (className) => {
    setClassSelection((prev) => (
      prev.includes(className)
        ? prev.filter((c) => c !== className)
        : [...prev, className]
    ));
  };

  return (
    <AppLayout>
      <PageTransition>
        <PageHeader
          title="Teachers"
          subtitle={
            isPlatformAdmin
              ? `Teachers for ${school?.name || 'selected school'}. Switch school in Portal Branding.`
              : `Manage teachers at ${school?.name || 'your school'}.`
          }
          actions={(
            <Button variant="primary" onClick={openCreate} disabled={!schoolId}>
              <Plus size={16} className="mr-1.5" />
              Add Teacher
            </Button>
          )}
        />

        <div className="admin-users-filters">
          <Input
            placeholder="Search name, email, mobile…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-users-filters__search"
          />
          <select
            className="admin-users-filters__select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-[#45474c]">Loading teachers…</p>
        ) : teachers.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No Teachers Yet"
            description="Add teacher accounts to let them manage classes, photos, and parent messages."
            action={(
              <Button variant="primary" onClick={openCreate} disabled={!schoolId}>
                Add Teacher
              </Button>
            )}
          />
        ) : (
          <ResponsiveDataTable
            columns={COLUMNS}
            data={teachers}
            minWidth={900}
            emptyMessage="No teachers found for this school."
            renderActions={(row) => (
              <>
                <TableActionButton onClick={() => openEdit(row)}>Edit</TableActionButton>
                <TableActionButton onClick={() => openAssign(row)}>Classes</TableActionButton>
                {row.status === 'active' && (
                  <TableActionButton
                    variant="danger"
                    onClick={() => { setSelected(row); setModal('deactivate'); }}
                  >
                    Deactivate
                  </TableActionButton>
                )}
              </>
            )}
          />
        )}

        <Modal
          open={modal === 'create' || modal === 'edit'}
          onClose={closeModal}
          title={modal === 'create' ? 'Add Teacher' : 'Edit Teacher'}
          footer={(
            <>
              <Button variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button
                variant="primary"
                loading={saving}
                onClick={modal === 'create' ? handleCreate : handleUpdate}
              >
                {modal === 'create' ? 'Create Teacher' : 'Save Changes'}
              </Button>
            </>
          )}
        >
          <div className="flex flex-col gap-3">
            <Input
              label="Full Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
            <Input
              label="Mobile"
              value={form.mobile}
              onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
              placeholder="10-digit mobile"
            />
            <Input
              label="Employee ID"
              value={form.employeeId}
              onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
            />
            <Input
              label="Subjects"
              value={form.subjects}
              onChange={(e) => setForm((f) => ({ ...f, subjects: e.target.value }))}
              placeholder="English, Maths (comma-separated)"
            />
          </div>
        </Modal>

        <Modal
          open={modal === 'assign'}
          onClose={closeModal}
          title={`Assign Classes — ${selected?.name || ''}`}
          footer={(
            <>
              <Button variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button variant="primary" loading={saving} onClick={handleAssignClasses}>
                Save Classes
              </Button>
            </>
          )}
        >
          <div className="flex flex-col gap-2">
            {classOptions.map((className) => (
              <label key={className} className="admin-toggle-row">
                <span className="admin-toggle-row__label">{className}</span>
                <input
                  type="checkbox"
                  checked={classSelection.includes(className)}
                  onChange={() => toggleClass(className)}
                />
              </label>
            ))}
          </div>
        </Modal>

        <Modal
          open={modal === 'created'}
          onClose={closeModal}
          title="Teacher Created"
          footer={<Button variant="primary" onClick={closeModal}>Done</Button>}
        >
          <p className="text-sm text-[#45474c]">
            Share this temporary password with the teacher. They should change it after first login.
          </p>
          {tempPassword && (
            <p className="mt-3 rounded-lg bg-[#f0f4ff] px-4 py-3 font-mono text-sm font-semibold text-[#0058be]">
              {tempPassword}
            </p>
          )}
        </Modal>

        <ConfirmModal
          open={modal === 'deactivate'}
          onClose={closeModal}
          onConfirm={handleDeactivate}
          title="Deactivate Teacher?"
          message={`${selected?.name || 'This teacher'} will no longer be able to sign in.`}
          confirmText="Deactivate"
          confirmVariant="danger"
          loading={saving}
        />
      </PageTransition>
    </AppLayout>
  );
}
