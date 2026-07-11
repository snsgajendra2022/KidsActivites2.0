import { useEffect, useMemo, useState } from 'react';
import { Users, Plus } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { EmptyState } from '../../components/ui/index.jsx';
import { ResponsiveDataTable, TableActionButton } from '../../components/ui/DataTable.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal, { ConfirmModal } from '../../components/ui/Modal.jsx';
import {
  listUsers,
  createAdminUser,
  deactivateAdminUser,
} from '../../services/userService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ROLES, ROLE_LABELS } from '../../constants/roles.js';
import '../../styles/admin-users.css';

const COLUMNS = [
  { key: 'name', label: 'Name', primary: true },
  { key: 'email', label: 'Email' },
  { key: 'mobile', label: 'Mobile' },
  {
    label: 'Role',
    muted: true,
    render: (row) => ROLE_LABELS[row.role] || row.roleLabel || row.role,
  },
  {
    label: 'Status',
    badge: true,
    render: (row) => (
      <span className={`admin-badge ${row.active === false ? 'admin-badge--muted' : 'admin-badge--success'}`}>
        {row.active === false ? 'Inactive' : 'Active'}
      </span>
    ),
  },
];

// All tenant account roles shown in the directory (creation still limited to admin/staff roles).
const ALL_ACCOUNT_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.SCHOOL_ADMIN,
  ROLES.ADMISSION_OFFICER,
  ROLES.ACCOUNTANT,
  ROLES.TEACHER,
  ROLES.PARENT,
  ROLES.STUDENT,
  ROLES.SUPPORT_STAFF,
];

const MOBILE_PATTERN = /^[6-9]\d{9}$/;

const EMPTY_FORM = { name: '', email: '', mobile: '', schoolId: '' };

export default function AdminUsers() {
  const { user } = useAuth();
  const { schools, activeSchoolId, school } = usePortalConfig();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tempPassword, setTempPassword] = useState(null);

  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
  const canManage = isSuperAdmin || user?.role === ROLES.SCHOOL_ADMIN;
  const defaultSchoolId = isSuperAdmin ? activeSchoolId : (user?.schoolId || activeSchoolId);

  const loadUsers = () => {
    setLoading(true);
    return listUsers({
      schoolId: schoolFilter || undefined,
      role: roleFilter || undefined,
      search,
    }, user)
      .then(setUsers)
      .catch((err) => {
        setUsers([]);
        toast(err.message || 'Failed to load users.', 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, schoolFilter, roleFilter, search]);

  const roleOptions = useMemo(() => ALL_ACCOUNT_ROLES, []);

  const closeModal = () => {
    setModal(null);
    setForm(EMPTY_FORM);
    setSelected(null);
    setTempPassword(null);
  };

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, schoolId: defaultSchoolId || '' });
    setModal('create');
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast('Name and email are required.', 'warning');
      return;
    }
    const mobile = form.mobile.trim();
    if (mobile && !MOBILE_PATTERN.test(mobile)) {
      toast('Mobile must be a valid 10-digit number.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const result = await createAdminUser({
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: mobile || undefined,
        role: ROLES.SCHOOL_ADMIN,
        schoolId: form.schoolId || defaultSchoolId || undefined,
      }, user);
      setTempPassword(result.tempPassword);
      await loadUsers();
      toast('Admin account created.', 'success');
      setModal('created');
    } catch (err) {
      toast(err.message || 'Failed to create admin.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    setSaving(true);
    try {
      await deactivateAdminUser(selected.id, user);
      await loadUsers();
      toast('User deactivated.', 'success');
      closeModal();
    } catch (err) {
      toast(err.message || 'Failed to deactivate user.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <PageTransition>
        <PageHeader
          title="All Users"
          subtitle="View every portal account in your school — admins, teachers, parents, and staff. Add new admin accounts here; teachers are managed on the Teachers page."
          actions={canManage ? (
            <Button variant="primary" onClick={openCreate}>
              <Plus size={16} className="mr-1.5" />
              Add Admin
            </Button>
          ) : null}
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
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
          >
            <option value="">All schools</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            className="admin-users-filters__select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All roles</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r] || r.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-[#45474c]">Loading users…</p>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Users Found"
            description="Try adjusting your search or filters, or add a new admin."
            action={canManage ? (
              <Button variant="primary" onClick={openCreate}>Add Admin</Button>
            ) : null}
          />
        ) : (
          <ResponsiveDataTable
            columns={COLUMNS}
            data={users}
            minWidth={720}
            emptyMessage="No users match your filters."
            renderActions={canManage ? (row) => (
              row.active !== false && row.id !== user?.id ? (
                <TableActionButton
                  variant="danger"
                  onClick={() => { setSelected(row); setModal('deactivate'); }}
                >
                  Deactivate
                </TableActionButton>
              ) : null
            ) : undefined}
          />
        )}

        <Modal
          open={modal === 'create'}
          onClose={closeModal}
          title="Add Admin"
          footer={(
            <>
              <Button variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button variant="primary" loading={saving} onClick={handleCreate}>
                Create Admin
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
              inputMode="numeric"
              maxLength={10}
            />
            {isSuperAdmin && schools.length > 0 ? (
              <label className="admin-field-label">
                School
                <select
                  className="admin-users-filters__select"
                  value={form.schoolId}
                  onChange={(e) => setForm((f) => ({ ...f, schoolId: e.target.value }))}
                >
                  <option value="">{school?.name || 'Current school'}</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </Modal>

        <Modal
          open={modal === 'created'}
          onClose={closeModal}
          title="Admin Created"
          footer={<Button variant="primary" onClick={closeModal}>Done</Button>}
        >
          <p className="text-sm text-[#45474c]">
            Share this temporary password with the new admin. They should change it after first login.
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
          title="Deactivate User?"
          message={`${selected?.name || 'This user'} will no longer be able to sign in.`}
          confirmText="Deactivate"
          confirmVariant="danger"
          loading={saving}
        />
      </PageTransition>
    </AppLayout>
  );
}
