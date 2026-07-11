import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, GraduationCap, IndianRupee, Layers, Mail, Plus, SearchX, UserCheck, UserX, Users,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader, EmptyState } from '../../components/ui/index.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Button from '../../components/ui/Button.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Modal, { ConfirmModal } from '../../components/ui/Modal.jsx';
import BentoStatCard from '../../components/dashboard/BentoStatCard.jsx';
import {
  ResponsiveDataTable,
  TableActionButton,
} from '../../components/ui/DataTable.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { listTeachers } from '../../services/teacherService.js';
import {
  listClasses,
  createClass,
  updateClass,
  deactivateClass,
  assignTeacherToClass,
  removeTeacherFromClass,
  listClassFees,
  createClassFee,
  updateClassFee,
  deactivateClassFee,
  FEE_CATEGORIES,
  BILLING_FREQUENCIES,
  formatBillingFrequency,
} from '../../services/classManagementService.js';
import '../../styles/admin-users.css';
import '../../styles/admin-modules.css';
import '../../styles/admin-teachers.css';
import '../../styles/class-management.css';

const TABS = [
  { id: 'classes', label: 'Classes', icon: GraduationCap },
  { id: 'teachers', label: 'Teacher Assignment', icon: Users },
  { id: 'fees', label: 'Class-wise Fees', icon: IndianRupee },
];

const EMPTY_CLASS = {
  name: '',
  code: '',
  ageGroup: '',
  capacity: 20,
  description: '',
  status: 'active',
};

const EMPTY_FEE = {
  feeType: '',
  feeCategory: 'Monthly Tuition Fee',
  amount: 0,
  billingFrequency: 'monthly',
  dueDay: 5,
  lateFeeApplicable: false,
  lateFeeAmount: 0,
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: '',
  status: 'active',
};

function StatusBadge({ status }) {
  const active = status === 'active';
  return (
    <span className={`admin-badge ${active ? 'admin-badge--success' : 'admin-badge--muted'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function formatAssignedDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function teacherInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'T';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function AssignedTeacherCard({ teacher, onRemove }) {
  return (
    <article className="class-mgmt-teacher-card">
      <div className="class-mgmt-teacher-card__inner">
        <div className="class-mgmt-teacher-card__head">
          <div className="class-mgmt-teacher-card__avatar" aria-hidden>
            {teacherInitials(teacher.teacherName)}
          </div>
          <div className="class-mgmt-teacher-card__meta">
            <h3 className="class-mgmt-teacher-card__name">{teacher.teacherName}</h3>
            {teacher.teacherEmail && (
              <p className="class-mgmt-teacher-card__email">
                <Mail size={12} aria-hidden />
                {teacher.teacherEmail}
              </p>
            )}
            <p className="class-mgmt-teacher-card__date">
              Assigned {formatAssignedDate(teacher.assignedAt)}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="class-mgmt-teacher-card__remove"
          onClick={onRemove}
        >
          <UserX size={14} aria-hidden />
          Remove
        </Button>
      </div>
    </article>
  );
}

export default function AdminClassManagement() {
  const { toast } = useToast();
  const { school } = usePortalConfig();
  const { tenantPath } = useTenantPath();
  const [tab, setTab] = useState('classes');
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feesLoading, setFeesLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classModal, setClassModal] = useState(null);
  const [classForm, setClassForm] = useState(EMPTY_CLASS);
  const [assignModal, setAssignModal] = useState(null);
  const [teacherToAssign, setTeacherToAssign] = useState('');
  const [feeModal, setFeeModal] = useState(null);
  const [feeForm, setFeeForm] = useState(EMPTY_FEE);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const activeClasses = useMemo(
    () => classes.filter((c) => c.status === 'active'),
    [classes],
  );

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || null,
    [classes, selectedClassId],
  );

  const stats = useMemo(() => ({
    total: classes.length,
    active: classes.filter((c) => c.status === 'active').length,
    withTeachers: classes.filter((c) => (c.assignedTeachers?.length ?? 0) > 0).length,
    inactive: classes.filter((c) => c.status === 'inactive').length,
  }), [classes]);

  const feeStats = useMemo(() => ({
    total: fees.length,
    active: fees.filter((f) => f.status === 'active').length,
    totalAmount: fees
      .filter((f) => f.status === 'active')
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0),
  }), [fees]);

  const loadClasses = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setRefreshing(true);
    try {
      const data = await listClasses({ search, status: statusFilter });
      setClasses(data);
      setSelectedClassId((prev) => {
        if (prev && data.some((c) => c.id === prev)) return prev;
        const firstActive = data.find((c) => c.status === 'active');
        return firstActive?.id || data[0]?.id || '';
      });
      setLoadError(null);
    } catch (err) {
      setLoadError(err.message || 'Failed to load classes.');
      throw err;
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, [search, statusFilter]);

  const loadTeachers = useCallback(async () => {
    const data = await listTeachers({ status: 'active' });
    setTeachers(data);
  }, []);

  const loadFees = useCallback(async () => {
    if (!selectedClassId) {
      setFees([]);
      return;
    }
    setFeesLoading(true);
    try {
      const data = await listClassFees(selectedClassId);
      setFees(data);
    } catch (err) {
      toast(err.message || 'Failed to load fee structure.', 'error');
      setFees([]);
    } finally {
      setFeesLoading(false);
    }
  }, [selectedClassId, toast]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      await Promise.all([loadClasses({ silent: true }), loadTeachers()]);
    } catch (err) {
      toast(err.message || 'Failed to load class management data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [loadClasses, loadTeachers, toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (loading) return;
    loadClasses().catch((err) => {
      toast(err.message || 'Failed to refresh classes.', 'error');
    });
  }, [search, statusFilter, loadClasses, loading, toast]);

  useEffect(() => { loadFees(); }, [loadFees]);

  const openAddClass = () => {
    setClassForm(EMPTY_CLASS);
    setClassModal('add');
  };

  const openEditClass = (row) => {
    setClassForm({
      name: row.name,
      code: row.code,
      ageGroup: row.ageGroup || '',
      capacity: row.capacity ?? 0,
      description: row.description || '',
      status: row.status || 'active',
    });
    setClassModal({ mode: 'edit', id: row.id });
  };

  const saveClass = async () => {
    if (!classForm.name?.trim()) {
      toast('Class name is required.', 'warning');
      return;
    }
    if (!classForm.code?.trim()) {
      toast('Class code is required.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...classForm,
        code: classForm.code.trim().toLowerCase(),
        capacity: Number(classForm.capacity) || 0,
      };
      if (classModal === 'add') {
        await createClass(payload);
        toast('Class added successfully.', 'success');
      } else {
        await updateClass(classModal.id, payload);
        toast('Class updated successfully.', 'success');
      }
      setClassModal(null);
      await loadClasses();
    } catch (err) {
      toast(err.message || 'Failed to save class.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateClass = async (row) => {
    setSaving(true);
    try {
      await deactivateClass(row.id);
      toast(`${row.name} deactivated.`, 'success');
      setConfirm(null);
      await loadClasses();
    } catch (err) {
      toast(err.message || 'Failed to deactivate class.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignTeacher = async () => {
    if (!assignModal || !teacherToAssign) return;
    setSaving(true);
    try {
      await assignTeacherToClass(assignModal.id, teacherToAssign);
      toast('Teacher assigned to class.', 'success');
      setAssignModal(null);
      setTeacherToAssign('');
      await loadClasses();
    } catch (err) {
      toast(err.message || 'Failed to assign teacher.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTeacher = async (classId, teacherId) => {
    setSaving(true);
    try {
      await removeTeacherFromClass(classId, teacherId);
      toast('Teacher removed from class.', 'success');
      setConfirm(null);
      await loadClasses();
    } catch (err) {
      toast(err.message || 'Failed to remove teacher.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openAddFee = () => {
    if (!selectedClassId) {
      toast('Select a class first.', 'warning');
      return;
    }
    setFeeForm({ ...EMPTY_FEE, effectiveFrom: new Date().toISOString().slice(0, 10) });
    setFeeModal('add');
  };

  const openEditFee = (fee) => {
    setFeeForm({
      feeType: fee.feeType || '',
      feeCategory: fee.feeCategory,
      amount: Number(fee.amount) || 0,
      billingFrequency: fee.billingFrequency,
      dueDay: fee.dueDay ?? '',
      lateFeeApplicable: Boolean(fee.lateFeeApplicable),
      lateFeeAmount: Number(fee.lateFeeAmount) || 0,
      effectiveFrom: fee.effectiveFrom?.slice(0, 10) || '',
      effectiveTo: fee.effectiveTo?.slice(0, 10) || '',
      status: fee.status || 'active',
    });
    setFeeModal({ mode: 'edit', id: fee.id });
  };

  const saveFee = async () => {
    if (!selectedClassId) return;
    if (!feeForm.feeCategory?.trim()) {
      toast('Fee category is required.', 'warning');
      return;
    }
    if (!feeForm.effectiveFrom) {
      toast('Effective from date is required.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...feeForm,
        amount: Number(feeForm.amount) || 0,
        dueDay: feeForm.dueDay === '' ? null : Number(feeForm.dueDay),
        lateFeeAmount: feeForm.lateFeeApplicable ? Number(feeForm.lateFeeAmount) || 0 : null,
        effectiveTo: feeForm.effectiveTo || null,
      };
      if (feeModal === 'add') {
        await createClassFee(selectedClassId, payload);
        toast('Fee item added.', 'success');
      } else {
        await updateClassFee(selectedClassId, feeModal.id, payload);
        toast('Fee item updated.', 'success');
      }
      setFeeModal(null);
      await loadFees();
    } catch (err) {
      toast(err.message || 'Failed to save fee item.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateFee = async (fee) => {
    setSaving(true);
    try {
      await deactivateClassFee(selectedClassId, fee.id);
      toast('Fee structure deactivated.', 'success');
      setConfirm(null);
      await loadFees();
    } catch (err) {
      toast(err.message || 'Failed to deactivate fee.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const classColumns = [
    { label: 'Class Name', primary: true, render: (r) => r.name },
    { label: 'Code', render: (r) => r.code?.toUpperCase() },
    { label: 'Age Group', render: (r) => r.ageGroup || '—' },
    { label: 'Capacity', render: (r) => r.capacity },
    { label: 'Teachers', render: (r) => r.assignedTeacherSummary || '—' },
    { label: 'Status', badge: true, render: (r) => <StatusBadge status={r.status} /> },
    {
      label: 'Updated',
      muted: true,
      render: (r) => (r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : '—'),
    },
  ];

  const feeColumns = [
    { label: 'Category', primary: true, render: (r) => r.feeCategory },
    { label: 'Amount', render: (r) => `₹${Number(r.amount).toLocaleString()}` },
    { label: 'Frequency', render: (r) => formatBillingFrequency(r.billingFrequency) },
    { label: 'Due Day', render: (r) => (r.dueDay != null ? `Day ${r.dueDay}` : '—') },
    { label: 'Late Fee', render: (r) => (r.lateFeeApplicable ? `₹${Number(r.lateFeeAmount || 0).toLocaleString()}` : 'No') },
    { label: 'Effective', muted: true, render: (r) => `${r.effectiveFrom || '—'}${r.effectiveTo ? ` → ${r.effectiveTo}` : ''}` },
    { label: 'Status', badge: true, render: (r) => <StatusBadge status={r.status} /> },
  ];

  const assignedTeacherIds = new Set(
    (assignModal?.assignedTeachers || selectedClass?.assignedTeachers || []).map((t) => t.teacherId),
  );

  const availableTeachers = teachers.filter((t) => !assignedTeacherIds.has(t.id));

  const classSelectOptions = activeClasses.map((c) => ({ value: c.id, label: c.name }));
  const showInitialLoading = loading && !classes.length && !loadError;
  const hasFilters = Boolean(search) || statusFilter !== 'all';

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="Class Management"
          subtitle={`Manage daycare classes, teacher assignments, and class-wise fees at ${school?.name || 'your school'}.`}
          actions={(
            <Link to={tenantPath('/admin/settings')} className="admin-link-back">
              <ArrowLeft size={16} />
              Back to Settings
            </Link>
          )}
        />

        <div className="admin-modules-tabs">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`admin-modules-tab ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {loadError && !showInitialLoading ? (
          <EmptyState
            icon={GraduationCap}
            title="Could Not Load Classes"
            description={loadError}
            action={(
              <Button variant="primary" onClick={loadAll}>
                Try Again
              </Button>
            )}
          />
        ) : showInitialLoading ? (
          <div className="admin-modules-loading" aria-busy="true" aria-label="Loading class management" />
        ) : (
          <>
            {!loading && classes.length > 0 && (
              <div className="admin-teachers-stats class-mgmt-stats">
                {tab === 'fees' ? (
                  <>
                    <BentoStatCard icon={IndianRupee} value={feeStats.active} label="Active Fee Items" variant="emerald" />
                    <BentoStatCard
                      icon={Layers}
                      value={`₹${feeStats.totalAmount.toLocaleString()}`}
                      label="Monthly Total (Active)"
                      variant="indigo"
                    />
                    <BentoStatCard icon={GraduationCap} value={stats.active} label="Active Classes" variant="rose" />
                    <BentoStatCard icon={Users} value={stats.withTeachers} label="Classes With Teachers" variant="indigo" />
                  </>
                ) : (
                  <>
                    <BentoStatCard icon={Layers} value={stats.total} label="Total Classes" variant="indigo" />
                    <BentoStatCard icon={UserCheck} value={stats.active} label="Active" variant="emerald" />
                    <BentoStatCard icon={Users} value={stats.withTeachers} label="With Teachers" variant="rose" />
                    <BentoStatCard icon={GraduationCap} value={stats.inactive} label="Inactive" variant="indigo" />
                  </>
                )}
              </div>
            )}

            {tab === 'classes' && (
              <section className="sb-card admin-modules-panel admin-modules-panel--flush class-mgmt-tab-panel">
                <div className="admin-modules-panel__head class-mgmt-toolbar">
                  <div className="admin-users-filters class-mgmt-filters">
                    <Input
                      placeholder="Search classes by name, code, or age group…"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="admin-users-filters__search"
                    />
                    <select
                      className="admin-users-filters__select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      aria-label="Filter by status"
                    >
                      <option value="all">All statuses</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <Button variant="primary" onClick={openAddClass}>
                    <Plus size={16} />
                    Add Class
                  </Button>
                </div>

                {classes.length === 0 && !hasFilters ? (
                  <div className="class-mgmt-panel-empty">
                    <EmptyState
                      icon={GraduationCap}
                      title="No Classes Yet"
                      description="Add your first class to start assigning teachers and defining class-wise fees."
                      action={(
                        <Button variant="primary" onClick={openAddClass}>
                          <Plus size={16} />
                          Add Class
                        </Button>
                      )}
                    />
                  </div>
                ) : classes.length === 0 && hasFilters ? (
                  <div className="admin-teachers-empty-filter class-mgmt-panel-empty">
                    <div className="admin-teachers-empty-filter__icon">
                      <SearchX size={24} aria-hidden />
                    </div>
                    <p className="admin-teachers-empty-filter__title">No matching classes</p>
                    <p className="admin-teachers-empty-filter__desc">
                      Try adjusting your search or status filter.
                    </p>
                  </div>
                ) : (
                  <>
                    {refreshing && (
                      <p className="admin-teachers-refresh class-mgmt-refresh">Refreshing classes…</p>
                    )}
                    <ResponsiveDataTable
                      nested
                      columns={classColumns}
                      data={classes}
                      keyExtractor={(row) => row.id}
                      minWidth={900}
                      emptyMessage="No classes match your filters."
                      renderActions={(row) => (
                        <>
                          <TableActionButton variant="outline" onClick={() => openEditClass(row)}>Edit</TableActionButton>
                          <TableActionButton
                            variant="outline"
                            disabled={row.status !== 'active'}
                            onClick={() => { setAssignModal(row); setTeacherToAssign(''); }}
                          >
                            Assign Teacher
                          </TableActionButton>
                          <TableActionButton
                            variant="outline"
                            onClick={() => { setSelectedClassId(row.id); setTab('fees'); }}
                          >
                            Manage Fees
                          </TableActionButton>
                          {row.status === 'active' && (
                            <TableActionButton
                              variant="outline"
                              onClick={() => setConfirm({ type: 'deactivateClass', row })}
                            >
                              Deactivate
                            </TableActionButton>
                          )}
                        </>
                      )}
                    />
                  </>
                )}
              </section>
            )}

            {tab === 'teachers' && (
              <section className="sb-card admin-modules-panel admin-modules-panel--flush class-mgmt-tab-panel">
                <div className="admin-modules-panel__head class-mgmt-toolbar class-mgmt-toolbar--stack">
                  <div className="class-mgmt-toolbar__intro">
                    <h3 className="admin-modules-panel__title">Teacher Assignment</h3>
                    <p className="admin-modules-panel__subtitle">
                      View and manage which teachers are assigned to each active class.
                    </p>
                  </div>
                  <div className="class-mgmt-toolbar__actions">
                    <Select
                      label="Select Class"
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      options={classSelectOptions}
                      className="class-mgmt-class-select"
                    />
                    <Button
                      variant="primary"
                      onClick={() => { setAssignModal(selectedClass); setTeacherToAssign(''); }}
                      disabled={!selectedClass}
                    >
                      <Plus size={16} />
                      Assign Teacher
                    </Button>
                  </div>
                </div>

                {activeClasses.length === 0 ? (
                  <div className="class-mgmt-panel-empty">
                    <EmptyState
                      icon={GraduationCap}
                      title="No Active Classes"
                      description="Add an active class before assigning teachers."
                      action={(
                        <Button variant="primary" onClick={() => { setTab('classes'); openAddClass(); }}>
                          <Plus size={16} />
                          Add Class
                        </Button>
                      )}
                    />
                  </div>
                ) : selectedClass ? (
                  <div className="class-mgmt-tab-body">
                    <div className="class-mgmt-class-banner">
                      <div className="class-mgmt-class-banner__icon" aria-hidden>
                        <GraduationCap size={20} />
                      </div>
                      <div className="class-mgmt-class-banner__meta">
                        <p className="class-mgmt-class-banner__name">{selectedClass.name}</p>
                        <p className="class-mgmt-class-banner__detail">
                          {selectedClass.code?.toUpperCase()}
                          {selectedClass.ageGroup ? ` · ${selectedClass.ageGroup}` : ''}
                          {selectedClass.capacity ? ` · Capacity ${selectedClass.capacity}` : ''}
                        </p>
                      </div>
                      <span className={`admin-badge ${selectedClass.status === 'active' ? 'admin-badge--success' : 'admin-badge--muted'}`}>
                        {selectedClass.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {refreshing && (
                      <p className="admin-teachers-refresh class-mgmt-refresh">Refreshing assignments…</p>
                    )}

                    {(selectedClass.assignedTeachers?.length ?? 0) === 0 ? (
                      <div className="class-mgmt-panel-empty class-mgmt-panel-empty--compact">
                        <EmptyState
                          icon={Users}
                          title="No Teachers Assigned"
                          description={`Assign teachers to ${selectedClass.name} so they can manage this class.`}
                          action={(
                            <Button
                              variant="primary"
                              onClick={() => { setAssignModal(selectedClass); setTeacherToAssign(''); }}
                            >
                              <Plus size={16} />
                              Assign Teacher
                            </Button>
                          )}
                        />
                      </div>
                    ) : (
                      <div className="class-mgmt-teacher-grid">
                        {selectedClass.assignedTeachers.map((t) => (
                          <AssignedTeacherCard
                            key={t.teacherId}
                            teacher={t}
                            onRemove={() => setConfirm({
                              type: 'removeTeacher',
                              classId: selectedClass.id,
                              teacherId: t.teacherId,
                              label: t.teacherName,
                            })}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </section>
            )}

            {tab === 'fees' && (
              <section className="sb-card admin-modules-panel admin-modules-panel--flush class-mgmt-tab-panel">
                <div className="admin-modules-panel__head class-mgmt-toolbar class-mgmt-toolbar--stack">
                  <div className="class-mgmt-toolbar__intro">
                    <h3 className="admin-modules-panel__title">Class-wise Fees</h3>
                    <p className="admin-modules-panel__subtitle">
                      Define tuition and other fee items for each class.
                    </p>
                  </div>
                  <div className="class-mgmt-toolbar__actions">
                    <Select
                      label="Select Class"
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      options={classSelectOptions}
                      className="class-mgmt-class-select"
                    />
                    <Button variant="primary" onClick={openAddFee} disabled={!selectedClassId}>
                      <Plus size={16} />
                      Add Fee Item
                    </Button>
                  </div>
                </div>

                {activeClasses.length === 0 ? (
                  <div className="class-mgmt-panel-empty">
                    <EmptyState
                      icon={GraduationCap}
                      title="No Active Classes"
                      description="Add an active class before defining fee structures."
                      action={(
                        <Button variant="primary" onClick={() => { setTab('classes'); openAddClass(); }}>
                          <Plus size={16} />
                          Add Class
                        </Button>
                      )}
                    />
                  </div>
                ) : !selectedClassId ? (
                  <div className="class-mgmt-panel-empty class-mgmt-panel-empty--compact">
                    <EmptyState
                      icon={IndianRupee}
                      title="Select a Class"
                      description="Choose a class above to view or manage its fee structure."
                    />
                  </div>
                ) : feesLoading ? (
                  <div className="class-mgmt-tab-body">
                    <div className="admin-modules-loading admin-modules-loading--inline" aria-busy="true" aria-label="Loading fees" />
                  </div>
                ) : fees.length === 0 ? (
                  <div className="class-mgmt-panel-empty class-mgmt-panel-empty--compact">
                    <EmptyState
                      icon={IndianRupee}
                      title="No Fee Structure Yet"
                      description={`Add fee items for ${selectedClass?.name || 'this class'} — tuition, transport, meals, and more.`}
                      action={(
                        <Button variant="primary" onClick={openAddFee}>
                          <Plus size={16} />
                          Add Fee Item
                        </Button>
                      )}
                    />
                  </div>
                ) : (
                  <>
                    {selectedClass && (
                      <div className="class-mgmt-class-banner class-mgmt-class-banner--fees">
                        <div className="class-mgmt-class-banner__icon" aria-hidden>
                          <IndianRupee size={20} />
                        </div>
                        <div className="class-mgmt-class-banner__meta">
                          <p className="class-mgmt-class-banner__name">{selectedClass.name}</p>
                          <p className="class-mgmt-class-banner__detail">
                            {feeStats.active} active fee item{feeStats.active === 1 ? '' : 's'}
                            {feeStats.totalAmount > 0 ? ` · ₹${feeStats.totalAmount.toLocaleString()} total (active)` : ''}
                          </p>
                        </div>
                      </div>
                    )}
                    <ResponsiveDataTable
                      nested
                      columns={feeColumns}
                      data={fees}
                      keyExtractor={(row) => row.id}
                      minWidth={960}
                      emptyMessage="No fee structure created for this class."
                      renderActions={(row) => (
                        <>
                          <TableActionButton variant="outline" onClick={() => openEditFee(row)}>Edit</TableActionButton>
                          {row.status === 'active' && (
                            <TableActionButton
                              variant="outline"
                              onClick={() => setConfirm({ type: 'deactivateFee', fee: row })}
                            >
                              Deactivate
                            </TableActionButton>
                          )}
                        </>
                      )}
                    />
                  </>
                )}
              </section>
            )}
          </>
        )}

        <Modal
          open={classModal !== null}
          onClose={() => setClassModal(null)}
          title={classModal === 'add' ? 'Add Class' : 'Edit Class'}
          size="lg"
          footer={(
            <>
              <Button variant="secondary" onClick={() => setClassModal(null)}>Cancel</Button>
              <Button variant="primary" loading={saving} onClick={saveClass}>Save Class</Button>
            </>
          )}
        >
          <div className="class-mgmt-modal">
            {classModal !== 'add' && classForm.name && (
              <div className="class-mgmt-class-banner class-mgmt-class-banner--modal">
                <div className="class-mgmt-class-banner__icon" aria-hidden>
                  <GraduationCap size={20} />
                </div>
                <div className="class-mgmt-class-banner__meta">
                  <p className="class-mgmt-class-banner__name">{classForm.name}</p>
                  <p className="class-mgmt-class-banner__detail">
                    {classForm.code ? classForm.code.toUpperCase() : 'Class details'}
                  </p>
                </div>
                <StatusBadge status={classForm.status} />
              </div>
            )}
            <div className="admin-modules-form-grid class-mgmt-form-grid">
              <Input label="Class Name" required value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} />
              <Input label="Class Code" required value={classForm.code} onChange={(e) => setClassForm({ ...classForm, code: e.target.value })} placeholder="e.g. nursery" />
              <Input label="Age Group" value={classForm.ageGroup} onChange={(e) => setClassForm({ ...classForm, ageGroup: e.target.value })} placeholder="e.g. 2-3 years" />
              <Input label="Capacity" type="number" min="0" value={classForm.capacity} onChange={(e) => setClassForm({ ...classForm, capacity: e.target.value })} />
              <Select
                label="Status"
                value={classForm.status}
                onChange={(e) => setClassForm({ ...classForm, status: e.target.value })}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
              <div className="admin-form-span-2">
                <Textarea label="Description" value={classForm.description} onChange={(e) => setClassForm({ ...classForm, description: e.target.value })} />
              </div>
            </div>
          </div>
        </Modal>

        <Modal
          open={Boolean(assignModal)}
          onClose={() => setAssignModal(null)}
          title="Assign Teacher"
          size="lg"
          footer={(
            <>
              <Button variant="secondary" onClick={() => setAssignModal(null)}>Cancel</Button>
              <Button variant="primary" loading={saving} onClick={handleAssignTeacher} disabled={!teacherToAssign}>
                Assign Teacher
              </Button>
            </>
          )}
        >
          <div className="class-mgmt-modal">
            <div className="class-mgmt-class-banner class-mgmt-class-banner--modal">
              <div className="class-mgmt-class-banner__icon" aria-hidden>
                <GraduationCap size={20} />
              </div>
              <div className="class-mgmt-class-banner__meta">
                <p className="class-mgmt-class-banner__name">{assignModal?.name || 'Class'}</p>
                <p className="class-mgmt-class-banner__detail">
                  {(assignModal?.assignedTeachers?.length ?? 0)} teacher{(assignModal?.assignedTeachers?.length ?? 0) === 1 ? '' : 's'} currently assigned
                </p>
              </div>
            </div>
            {availableTeachers.length === 0 ? (
              <p className="admin-teacher-form__empty-hint">
                No available teachers to assign. All active teachers may already be assigned to this class, or you need to add teachers first.
              </p>
            ) : (
              <Select
                label="Select Teacher"
                value={teacherToAssign}
                onChange={(e) => setTeacherToAssign(e.target.value)}
                options={[
                  { value: '', label: 'Choose a teacher…' },
                  ...availableTeachers.map((t) => ({ value: t.id, label: `${t.name} (${t.email})` })),
                ]}
              />
            )}
          </div>
        </Modal>

        <Modal
          open={feeModal !== null}
          onClose={() => setFeeModal(null)}
          title={feeModal === 'add' ? 'Add Fee Item' : 'Edit Fee Item'}
          size="lg"
          footer={(
            <>
              <Button variant="secondary" onClick={() => setFeeModal(null)}>Cancel</Button>
              <Button variant="primary" loading={saving} onClick={saveFee}>Save Fee</Button>
            </>
          )}
        >
          <div className="class-mgmt-modal">
            {selectedClass && (
              <div className="class-mgmt-class-banner class-mgmt-class-banner--modal">
                <div className="class-mgmt-class-banner__icon" aria-hidden>
                  <IndianRupee size={20} />
                </div>
                <div className="class-mgmt-class-banner__meta">
                  <p className="class-mgmt-class-banner__name">{selectedClass.name}</p>
                  <p className="class-mgmt-class-banner__detail">Fee structure for this class</p>
                </div>
              </div>
            )}
            <div className="admin-modules-form-grid class-mgmt-form-grid">
            <Select
              label="Fee Category"
              value={feeForm.feeCategory}
              onChange={(e) => setFeeForm({ ...feeForm, feeCategory: e.target.value })}
              options={FEE_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <Input label="Fee Type (optional)" value={feeForm.feeType} onChange={(e) => setFeeForm({ ...feeForm, feeType: e.target.value })} />
            <Input label="Amount (₹)" type="number" min="0" value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })} />
            <Select
              label="Billing Frequency"
              value={feeForm.billingFrequency}
              onChange={(e) => setFeeForm({ ...feeForm, billingFrequency: e.target.value })}
              options={BILLING_FREQUENCIES}
            />
            <Input label="Due Day (of month)" type="number" min="1" max="31" value={feeForm.dueDay} onChange={(e) => setFeeForm({ ...feeForm, dueDay: e.target.value })} />
            <Input label="Effective From" type="date" required value={feeForm.effectiveFrom} onChange={(e) => setFeeForm({ ...feeForm, effectiveFrom: e.target.value })} />
            <Input label="Effective To (optional)" type="date" value={feeForm.effectiveTo} onChange={(e) => setFeeForm({ ...feeForm, effectiveTo: e.target.value })} />
            <label className="admin-toggle-row admin-form-span-2">
              <span className="admin-toggle-row__label">Late Fee Applicable</span>
              <input
                type="checkbox"
                checked={feeForm.lateFeeApplicable}
                onChange={(e) => setFeeForm({ ...feeForm, lateFeeApplicable: e.target.checked })}
              />
            </label>
            {feeForm.lateFeeApplicable && (
              <Input label="Late Fee Amount (₹)" type="number" min="0" value={feeForm.lateFeeAmount} onChange={(e) => setFeeForm({ ...feeForm, lateFeeAmount: e.target.value })} />
            )}
            </div>
          </div>
        </Modal>

        <ConfirmModal
          open={confirm?.type === 'deactivateClass'}
          onClose={() => setConfirm(null)}
          onConfirm={() => handleDeactivateClass(confirm.row)}
          title="Deactivate Class?"
          message={`Deactivate "${confirm?.row?.name}"? Students already enrolled will not be removed.`}
          confirmText="Deactivate"
          loading={saving}
        />

        <ConfirmModal
          open={confirm?.type === 'deactivateFee'}
          onClose={() => setConfirm(null)}
          onConfirm={() => handleDeactivateFee(confirm.fee)}
          title="Deactivate Fee?"
          message={`Deactivate "${confirm?.fee?.feeCategory}" for this class?`}
          confirmText="Deactivate"
          loading={saving}
        />

        <ConfirmModal
          open={confirm?.type === 'removeTeacher'}
          onClose={() => setConfirm(null)}
          onConfirm={() => handleRemoveTeacher(confirm.classId, confirm.teacherId)}
          title="Remove Teacher?"
          message={`Remove ${confirm?.label} from this class?`}
          confirmText="Remove"
          loading={saving}
        />
      </PageTransition>
    </DashboardLayout>
  );
}
