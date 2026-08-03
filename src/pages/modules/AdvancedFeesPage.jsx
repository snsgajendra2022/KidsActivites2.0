import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { LoadingState, PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { useClassStudentOptions } from '../../hooks/useClassStudentOptions.js';
import { todayISODate } from '../../components/attendance/AttendanceFilters.jsx';
import {
  createFeeCheckout,
  generateFeeInvoicesForStudents,
  getFeeStructureForClass,
  listFeeStructures,
  processFeeRefund,
  scheduleFeeReminders,
} from '../../services/advancedFeeService.js';
import StudentMultiSelect from '../../components/ui/StudentMultiSelect.jsx';

function addDaysISO(baseISO, days) {
  const date = new Date(`${baseISO}T12:00:00`);
  if (Number.isNaN(date.getTime())) return baseISO;
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

export default function AdvancedFeesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenantPath } = useTenantPath();
  const [form, setForm] = useState({
    classId: '',
    studentIds: [],
    feeStructureId: '',
    discount: 500,
    scholarship: 1000,
    reminderDays: 3,
    refundAmount: 0,
    onlineGateway: 'razorpay',
    dueDate: addDaysISO(todayISODate(), 10),
  });
  const [structures, setStructures] = useState([]);
  const [structure, setStructure] = useState(null);
  const [structureLoading, setStructureLoading] = useState(false);
  const [structureError, setStructureError] = useState('');
  const [lastInvoice, setLastInvoice] = useState(null);
  const [busy, setBusy] = useState('');

  const {
    classOptions,
    studentOptions,
    classesLoading,
    studentsLoading,
    classesError,
    studentsError,
  } = useClassStudentOptions(user, form.classId);

  const selectedClassLabel = classOptions.find((option) => option.value === form.classId)?.label || 'Select a class';
  const selectedCount = form.studentIds?.length || 0;

  const loadStructures = useCallback(async (classId) => {
    setStructureLoading(true);
    setStructureError('');
    try {
      const [forClass, all] = await Promise.all([
        getFeeStructureForClass(classId || undefined),
        listFeeStructures().catch(() => []),
      ]);
      setStructures(Array.isArray(all) ? all : []);
      setStructure(forClass);
      setForm((prev) => ({
        ...prev,
        feeStructureId: forClass?.id || prev.feeStructureId || '',
      }));
    } catch (err) {
      setStructures([]);
      setStructure(null);
      setStructureError(err?.message || 'Unable to load fee structures.');
    } finally {
      setStructureLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStructures('');
  }, [loadStructures]);

  useEffect(() => {
    if (!form.classId) return;
    void loadStructures(form.classId);
  }, [form.classId, loadStructures]);

  useEffect(() => {
    if (!form.feeStructureId) return;
    const selected = structures.find((item) => String(item.id) === String(form.feeStructureId));
    if (selected) setStructure(selected);
  }, [form.feeStructureId, structures]);

  const heads = structure?.heads || [];

  const totals = useMemo(() => {
    const gross = structure?.gross != null
      ? Number(structure.gross)
      : heads.reduce((sum, head) => sum + Number(head.amount || 0), 0);
    const net = Math.max(0, gross - Number(form.discount || 0) - Number(form.scholarship || 0));
    return { gross, net };
  }, [structure, heads, form.discount, form.scholarship]);

  const structureOptions = useMemo(
    () => structures.map((item) => ({
      value: String(item.id),
      label: item.name || item.label || item.id,
    })),
    [structures],
  );

  const requireClassStudents = () => {
    if (!form.classId) {
      toast('Select a class.', 'warning');
      return false;
    }
    if (!form.studentIds?.length) {
      toast('Select one or more students from the class roster.', 'warning');
      return false;
    }
    return true;
  };

  const handleGenerateInvoice = async () => {
    if (!requireClassStudents()) return;
    setBusy('invoice');
    try {
      let feeStructureId = form.feeStructureId || structure?.id || undefined;
      if (feeStructureId && String(feeStructureId).startsWith('fs-default')) {
        feeStructureId = undefined;
      }
      const result = await generateFeeInvoicesForStudents({
        classId: form.classId,
        feeStructureId,
        discount: Number(form.discount || 0),
        scholarship: Number(form.scholarship || 0),
        dueDate: form.dueDate || null,
        gateway: form.onlineGateway,
      }, form.studentIds);
      setLastInvoice(result);
      const net = result?.net ?? totals.net;
      toast(
        result?.message
          || `Invoices generated for ${selectedCount} student(s) in ${selectedClassLabel}. Net payable ₹${Number(net).toLocaleString('en-IN')} each.`,
        'success',
      );
    } catch (err) {
      toast(err?.message || 'Unable to generate invoice.', 'error');
    } finally {
      setBusy('');
    }
  };

  const handleScheduleReminders = async () => {
    if (!lastInvoice?.id && (!form.classId || !form.studentIds?.length)) {
      toast('Select class/students or generate invoices first.', 'warning');
      return;
    }
    setBusy('reminders');
    try {
      const result = await scheduleFeeReminders({
        classId: form.classId || undefined,
        studentIds: form.studentIds?.length ? form.studentIds : undefined,
        studentId: form.studentIds?.[0] || undefined,
        invoiceId: lastInvoice?.id || undefined,
        daysBeforeDue: Number(form.reminderDays || 3),
        reminderDays: Number(form.reminderDays || 3),
        dueDate: form.dueDate || lastInvoice?.dueDate || undefined,
      });
      toast(
        result?.message
          || `Due reminders scheduled ${form.reminderDays} days before due date.`,
        'success',
      );
    } catch (err) {
      toast(err?.message || 'Unable to schedule reminders.', 'error');
    } finally {
      setBusy('');
    }
  };

  const handleRefund = async () => {
    const amount = Number(form.refundAmount || 0);
    if (amount <= 0) {
      toast('Enter a refund amount first.', 'warning');
      return;
    }
    if (!lastInvoice?.id && !form.studentIds?.length) {
      toast('Generate an invoice or select students before refunding.', 'warning');
      return;
    }
    setBusy('refund');
    try {
      const result = await processFeeRefund({
        invoiceId: lastInvoice?.id || undefined,
        studentId: form.studentIds?.[0] || lastInvoice?.studentId || undefined,
        studentIds: form.studentIds?.length ? form.studentIds : undefined,
        amount,
        reason: 'Admin refund from Advanced Fees',
        gateway: form.onlineGateway,
      });
      toast(result?.message || `Refund of ₹${amount.toLocaleString('en-IN')} queued.`, 'success');
    } catch (err) {
      toast(err?.message || 'Unable to process refund.', 'error');
    } finally {
      setBusy('');
    }
  };

  const handleCheckout = async () => {
    if (!lastInvoice?.id) {
      toast('Generate an invoice before starting checkout.', 'warning');
      return;
    }
    if (form.onlineGateway === 'manual') {
      toast('Manual proof mode selected — no online checkout session created.', 'info');
      return;
    }
    setBusy('checkout');
    try {
      const result = await createFeeCheckout({
        invoiceId: lastInvoice.id,
        gateway: form.onlineGateway,
        amount: Number(lastInvoice.net ?? totals.net),
        studentId: form.studentIds?.[0] || lastInvoice.studentId,
        studentIds: form.studentIds?.length ? form.studentIds : undefined,
      });
      toast(result?.message || `Checkout created via ${form.onlineGateway}.`, 'success');
    } catch (err) {
      toast(err?.message || 'Unable to create checkout session.', 'error');
    } finally {
      setBusy('');
    }
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="Advanced Fee Management"
          subtitle="Select many students at once for invoices, discounts, scholarships, reminders, refunds, and checkout."
          actions={(
            <Link to={tenantPath('/admin/fees')} className="sb-button-secondary">
              Open Fee Verification
            </Link>
          )}
        />

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="sb-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-base font-bold text-[#0b1c30]">
                Fee Structure · {selectedClassLabel}
              </h2>
              {structure?.name && (
                <span className="rounded-full bg-[#eef4ff] px-2.5 py-1 text-[11px] font-semibold text-[#0058be]">
                  {structure.name}
                </span>
              )}
            </div>

            {structureLoading ? (
              <LoadingState message="Loading fee structure…" />
            ) : structureError ? (
              <p className="mt-4 text-sm text-[#b42318]">{structureError}</p>
            ) : heads.length === 0 ? (
              <p className="mt-4 text-sm text-[#667085]">
                No fee heads found for this class yet. A default structure will be used until one is configured.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {heads.map((head) => (
                  <div key={head.id || head.key} className="flex items-center justify-between rounded-lg bg-[#f7f9fc] px-4 py-3 text-sm">
                    <span>{head.name || head.label}</span>
                    <strong>₹{Number(head.amount || 0).toLocaleString('en-IN')}</strong>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-[#edf0f5] px-1 pt-3 text-sm">
                  <span>Gross</span>
                  <strong>₹{totals.gross.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex items-center justify-between px-1 text-sm text-emerald-700">
                  <span>After Discount + Scholarship</span>
                  <strong>₹{totals.net.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            )}

            {lastInvoice?.id && (
              <div className="mt-4 rounded-lg border border-[#d0d5dd] bg-[#f8f9ff] px-4 py-3 text-sm text-[#344054]">
                Last invoice: <strong>{lastInvoice.id}</strong>
                {' · '}
                status <strong className="capitalize">{lastInvoice.status || 'issued'}</strong>
                {' · '}
                net ₹{Number(lastInvoice.net ?? totals.net).toLocaleString('en-IN')}
              </div>
            )}
          </section>

          <section className="sb-card p-5">
            <h2 className="mb-4 text-base font-bold text-[#0b1c30]">Billing Controls</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Select
                  label="Class"
                  required
                  value={form.classId}
                  onChange={(event) => setForm({
                    ...form,
                    classId: event.target.value,
                    studentIds: [],
                  })}
                  options={classOptions}
                  placeholder={classesLoading ? 'Loading classes…' : 'Select class'}
                  disabled={classesLoading}
                />
                {classesError && <p className="mt-1 text-xs text-[#b42318]">{classesError}</p>}
              </div>
              <StudentMultiSelect
                required
                classId={form.classId}
                options={studentOptions}
                selectedIds={form.studentIds}
                onChange={(studentIds) => setForm({ ...form, studentIds })}
                loading={studentsLoading}
                error={studentsError}
                disabled={!form.classId || studentsLoading}
              />
              <Select
                label="Fee Structure"
                value={form.feeStructureId}
                onChange={(event) => setForm({ ...form, feeStructureId: event.target.value })}
                options={structureOptions}
                placeholder={structureLoading ? 'Loading…' : 'Select structure'}
                disabled={structureLoading || structureOptions.length === 0}
              />
              <Select
                label="Online Payment Gateway"
                value={form.onlineGateway}
                onChange={(event) => setForm({ ...form, onlineGateway: event.target.value })}
                options={[
                  { value: 'razorpay', label: 'Razorpay' },
                  { value: 'stripe', label: 'Stripe' },
                  { value: 'manual', label: 'Manual Proof Only' },
                ]}
              />
              <Input
                label="Discount (₹)"
                type="number"
                min="0"
                value={form.discount}
                onChange={(event) => setForm({ ...form, discount: event.target.value })}
              />
              <Input
                label="Scholarship (₹)"
                type="number"
                min="0"
                value={form.scholarship}
                onChange={(event) => setForm({ ...form, scholarship: event.target.value })}
              />
              <Input
                label="Due Date"
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
              />
              <Input
                label="Due Reminder (days before)"
                type="number"
                min="0"
                value={form.reminderDays}
                onChange={(event) => setForm({ ...form, reminderDays: event.target.value })}
              />
              <Input
                label="Refund Amount (₹)"
                type="number"
                min="0"
                value={form.refundAmount}
                onChange={(event) => setForm({ ...form, refundAmount: event.target.value })}
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={handleGenerateInvoice} loading={busy === 'invoice'} disabled={Boolean(busy)}>
                {selectedCount > 1 ? `Generate ${selectedCount} Invoices` : 'Generate Invoice'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleScheduleReminders}
                loading={busy === 'reminders'}
                disabled={Boolean(busy)}
              >
                Schedule Reminders
              </Button>
              <Button
                variant="outline"
                onClick={handleRefund}
                loading={busy === 'refund'}
                disabled={Boolean(busy)}
              >
                Process Refund
              </Button>
              <Button
                variant="secondary"
                onClick={handleCheckout}
                loading={busy === 'checkout'}
                disabled={Boolean(busy)}
              >
                Create Checkout
              </Button>
            </div>
            <p className="mt-4 text-xs text-[#667085]">
              Reports available: collection, pending fees, monthly revenue, and class-wise collection via Admin Reports.
            </p>
          </section>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
