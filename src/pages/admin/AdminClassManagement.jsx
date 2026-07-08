import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, GraduationCap, IndianRupee, Plus, Search, Users,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Button from '../../components/ui/Button.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Modal, { ConfirmModal } from '../../components/ui/Modal.jsx';
import {
  ResponsiveDataTable,
  TableActionButton,
} from '../../components/ui/DataTable.jsx';
import { useToast } from '../../context/ToastContext.jsx';
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
import '../../styles/admin-modules.css';
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

export default function AdminClassManagement() {
  const { toast } = useToast();
  const { tenantPath } = useTenantPath();
  const [tab, setTab] = useState('classes');
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || null,
    [classes, selectedClassId],
  );

  const loadClasses = useCallback(async () => {
    const data = await listClasses({ search, status: statusFilter });
    setClasses(data);
    setSelectedClassId((prev) => prev || data[0]?.id || '');
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
    const data = await listClassFees(selectedClassId);
    setFees(data);
  }, [selectedClassId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadClasses(), loadTeachers()]);
    } catch {
      toast('Failed to load class management data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [loadClasses, loadTeachers, toast]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    loadClasses().catch(() => toast('Failed to refresh classes.', 'error'));
  }, [search, statusFilter, loadClasses, toast]);
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
    } catch {
      toast('Failed to save class.', 'error');
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
    } catch {
      toast('Failed to deactivate class.', 'error');
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
    } catch {
      toast('Failed to assign teacher. They may already be assigned.', 'error');
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
    } catch {
      toast('Failed to remove teacher.', 'error');
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
    } catch {
      toast('Failed to save fee item.', 'error');
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
    } catch {
      toast('Failed to deactivate fee.', 'error');
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

  return (
    <DashboardLayout>
      <PageHeader
        title="Class Management"
        subtitle="Manage daycare classes, teacher assignments, and class-wise fees."
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

      {loading ? (
        <div className="admin-modules-loading" />
      ) : (
        <>
          {tab === 'classes' && (
            <section className="sb-card admin-modules-panel admin-modules-panel--flush">
              <div className="admin-modules-panel__head class-mgmt-toolbar">
                <div className="class-mgmt-filters">
                  <div className="class-mgmt-search">
                    <Search size={16} />
                    <input
                      type="search"
                      placeholder="Search classes..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'All statuses' },
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                  />
                </div>
                <Button variant="primary" onClick={openAddClass}>
                  <Plus size={16} />
                  Add Class
                </Button>
              </div>
              <ResponsiveDataTable
                nested
                columns={classColumns}
                data={classes}
                keyExtractor={(row) => row.id}
                minWidth={900}
                emptyMessage="No classes added yet."
                renderActions={(row) => (
                  <>
                    <TableActionButton variant="outline" onClick={() => openEditClass(row)}>Edit</TableActionButton>
                    <TableActionButton variant="outline" onClick={() => { setAssignModal(row); setTeacherToAssign(''); }}>
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
            </section>
          )}

          {tab === 'teachers' && (
            <section className="sb-card admin-modules-panel">
              <h3 className="admin-modules-panel__title">Teacher Assignment</h3>
              <p className="admin-modules-panel__subtitle">
                View and manage which teachers are assigned to each active class.
              </p>
              <Select
                label="Select Class"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                options={classes.map((c) => ({ value: c.id, label: c.name }))}
              />
              {selectedClass ? (
                <>
                  <div className="class-mgmt-assignment-head">
                    <Button variant="outline" onClick={() => { setAssignModal(selectedClass); setTeacherToAssign(''); }}>
                      <Plus size={16} />
                      Assign Teacher
                    </Button>
                  </div>
                  {(selectedClass.assignedTeachers?.length ?? 0) === 0 ? (
                    <p className="class-mgmt-empty">No teachers assigned to this class.</p>
                  ) : (
                    <ul className="class-mgmt-teacher-list">
                      {selectedClass.assignedTeachers.map((t) => (
                        <li key={t.teacherId}>
                          <div>
                            <strong>{t.teacherName}</strong>
                            {t.teacherEmail && <span>{t.teacherEmail}</span>}
                            <small>Assigned {t.assignedAt ? new Date(t.assignedAt).toLocaleDateString() : '—'}</small>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => setConfirm({
                              type: 'removeTeacher',
                              classId: selectedClass.id,
                              teacherId: t.teacherId,
                              label: t.teacherName,
                            })}
                          >
                            Remove
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="class-mgmt-empty">No classes available. Add a class first.</p>
              )}
            </section>
          )}

          {tab === 'fees' && (
            <section className="sb-card admin-modules-panel admin-modules-panel--flush">
              <div className="admin-modules-panel__head class-mgmt-toolbar">
                <Select
                  label="Select Class"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  options={classes.map((c) => ({ value: c.id, label: c.name }))}
                />
                <Button variant="primary" onClick={openAddFee} disabled={!selectedClassId}>
                  <Plus size={16} />
                  Add Fee Item
                </Button>
              </div>
              <ResponsiveDataTable
                nested
                columns={feeColumns}
                data={fees}
                keyExtractor={(row) => row.id}
                minWidth={960}
                emptyMessage={selectedClassId ? 'No fee structure created for this class.' : 'Select a class to manage fees.'}
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
            </section>
          )}
        </>
      )}

      <Modal
        open={classModal !== null}
        onClose={() => setClassModal(null)}
        title={classModal === 'add' ? 'Add Class' : 'Edit Class'}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setClassModal(null)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={saveClass}>Save Class</Button>
          </>
        )}
      >
        <div className="admin-modules-form-grid">
          <Input label="Class Name" required value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} />
          <Input label="Class Code" required value={classForm.code} onChange={(e) => setClassForm({ ...classForm, code: e.target.value })} placeholder="e.g. nursery" />
          <Input label="Age Group" value={classForm.ageGroup} onChange={(e) => setClassForm({ ...classForm, ageGroup: e.target.value })} placeholder="e.g. 2–3 years" />
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
      </Modal>

      <Modal
        open={Boolean(assignModal)}
        onClose={() => setAssignModal(null)}
        title={`Assign Teacher — ${assignModal?.name || ''}`}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setAssignModal(null)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleAssignTeacher} disabled={!teacherToAssign}>
              Assign Teacher
            </Button>
          </>
        )}
      >
        {availableTeachers.length === 0 ? (
          <p className="class-mgmt-empty">No available teachers to assign.</p>
        ) : (
          <Select
            label="Teacher"
            value={teacherToAssign}
            onChange={(e) => setTeacherToAssign(e.target.value)}
            options={[
              { value: '', label: 'Select teacher...' },
              ...availableTeachers.map((t) => ({ value: t.id, label: `${t.name} (${t.email})` })),
            ]}
          />
        )}
      </Modal>

      <Modal
        open={feeModal !== null}
        onClose={() => setFeeModal(null)}
        title={feeModal === 'add' ? 'Add Fee Item' : 'Edit Fee Item'}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setFeeModal(null)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={saveFee}>Save Fee</Button>
          </>
        )}
      >
        <div className="admin-modules-form-grid">
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
    </DashboardLayout>
  );
}
