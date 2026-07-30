import { useMemo, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Link } from 'react-router-dom';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { useClassStudentOptions } from '../../hooks/useClassStudentOptions.js';

const FEE_HEADS = [
  { key: 'tuition', label: 'Tuition Fee', amount: 12000 },
  { key: 'transport', label: 'Transport Fee', amount: 3000 },
  { key: 'activity', label: 'Activity Fee', amount: 1500 },
  { key: 'exam', label: 'Exam Fee', amount: 800 },
];

export default function AdvancedFeesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenantPath } = useTenantPath();
  const [form, setForm] = useState({
    classId: '',
    studentId: '',
    discount: 500,
    scholarship: 1000,
    reminderDays: 3,
    refundAmount: 0,
    onlineGateway: 'razorpay',
  });
  const {
    classOptions,
    studentOptions,
    classesLoading,
    studentsLoading,
    classesError,
    studentsError,
  } = useClassStudentOptions(user, form.classId);
  const selectedClassLabel = classOptions.find((option) => option.value === form.classId)?.label || 'Select a class';
  const selectedStudentLabel = studentOptions.find((option) => option.value === form.studentId)?.label || 'student';

  const totals = useMemo(() => {
    const gross = FEE_HEADS.reduce((sum, head) => sum + head.amount, 0);
    const net = Math.max(0, gross - Number(form.discount || 0) - Number(form.scholarship || 0));
    return { gross, net };
  }, [form.discount, form.scholarship]);

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="Advanced Fee Management"
          subtitle="Fee heads, invoices, discounts, scholarships, reminders, refunds, and online payment setup."
          actions={(
            <Link to={tenantPath('/admin/fees')} className="sb-button-secondary">
              Open Fee Verification
            </Link>
          )}
        />

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="sb-card p-5">
            <h2 className="text-base font-bold text-[#0b1c30]">Fee Structure · {selectedClassLabel}</h2>
            <div className="mt-4 space-y-2">
              {FEE_HEADS.map((head) => (
                <div key={head.key} className="flex items-center justify-between rounded-lg bg-[#f7f9fc] px-4 py-3 text-sm">
                  <span>{head.label}</span>
                  <strong>₹{head.amount.toLocaleString('en-IN')}</strong>
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
                    studentId: '',
                  })}
                  options={classOptions}
                  placeholder={classesLoading ? 'Loading classes…' : 'Select class'}
                  disabled={classesLoading}
                />
                {classesError && <p className="mt-1 text-xs text-[#b42318]">{classesError}</p>}
              </div>
              <div>
                <Select
                  label="Student"
                  required
                  value={form.studentId}
                  onChange={(event) => setForm({ ...form, studentId: event.target.value })}
                  options={studentOptions}
                  placeholder={!form.classId
                    ? 'Select class first'
                    : (studentsLoading ? 'Loading students…' : 'Select student')}
                  disabled={!form.classId || studentsLoading}
                />
                {studentsError && <p className="mt-1 text-xs text-[#b42318]">{studentsError}</p>}
              </div>
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
              <Input label="Discount (₹)" type="number" value={form.discount} onChange={(event) => setForm({ ...form, discount: event.target.value })} />
              <Input label="Scholarship (₹)" type="number" value={form.scholarship} onChange={(event) => setForm({ ...form, scholarship: event.target.value })} />
              <Input label="Due Reminder (days before)" type="number" value={form.reminderDays} onChange={(event) => setForm({ ...form, reminderDays: event.target.value })} />
              <Input label="Refund Amount (₹)" type="number" value={form.refundAmount} onChange={(event) => setForm({ ...form, refundAmount: event.target.value })} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  if (!form.classId || !form.studentId) {
                    toast('Select a class and student before generating an invoice.', 'warning');
                    return;
                  }
                  toast(`Invoice generated for ${selectedStudentLabel} in ${selectedClassLabel}. Net payable ₹${totals.net.toLocaleString('en-IN')}.`, 'success');
                }}
              >
                Generate Invoice
              </Button>
              <Button variant="secondary" onClick={() => toast(`Due reminders scheduled ${form.reminderDays} days before due date.`, 'success')}>
                Schedule Reminders
              </Button>
              <Button variant="outline" onClick={() => toast(Number(form.refundAmount) > 0 ? `Refund of ₹${form.refundAmount} queued.` : 'Enter a refund amount first.', Number(form.refundAmount) > 0 ? 'success' : 'warning')}>
                Process Refund
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
