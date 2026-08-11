import { useEffect, useState } from 'react';
import { Building2, CreditCard, Download } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import SmartFileUpload from '../../components/upload/SmartFileUpload.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { getApplicationByParent } from '../../services/enrollmentService.js';
import { getMyFee, normalizeFee, submitPayment } from '../../services/feeService.js';
import { listParentFees } from '../../services/advancedFeeService.js';
import { downloadFeeReceipt } from '../../utils/feeReceipt.js';
import '../../styles/fee-payment.css';

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'cash', label: 'Cash' },
];

function formatBreakdownLabel(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
}

function isFeeAssigned(fee) {
  if (!fee) return false;
  if (fee.status === 'not_assigned') return false;
  if (fee.breakdown && Object.keys(fee.breakdown).length > 0) return true;
  if (Number(fee.total) > 0) return true;
  return Boolean(fee.status && fee.status !== 'not_assigned');
}

function toParentFeeView(item) {
  if (!item) return null;
  if (item.breakdown || item.applicationId || item.payment || item.applicationNo) {
    return normalizeFee(item);
  }
  const heads = item.heads || item.lineItems || item.items || [];
  const breakdown = item.breakdown
    || (Array.isArray(heads)
      ? heads.reduce((acc, line, index) => {
        const key = line.key || line.name || line.label || `item_${index + 1}`;
        acc[key] = Number(line.amount ?? line.net ?? 0);
        return acc;
      }, {})
      : null);
  const statusRaw = String(item.status || '').toLowerCase();
  const status = statusRaw === 'paid' || statusRaw === 'verified'
    ? 'verified'
    : (statusRaw === 'partial' || statusRaw === 'issued' || statusRaw === 'draft'
      ? 'fee_pending'
      : (statusRaw || 'fee_pending'));
  return normalizeFee({
    id: item.id || item.invoiceId,
    applicationId: item.applicationId || item.studentId || null,
    applicationNo: item.invoiceNo || item.applicationNo || item.id,
    studentName: item.studentName || item.student?.fullName || null,
    classId: item.classId || null,
    className: item.className || item.classApplying || null,
    title: item.title || (item.source === 'enrollment' ? 'Enrollment Fee' : 'Fee Invoice'),
    dueDate: item.dueDate || null,
    status,
    breakdown,
    total: Number(item.netAmount ?? item.total ?? item.amount ?? item.gross ?? 0),
    payment: item.payment || null,
    source: item.source || 'invoice',
  });
}

export default function ParentFees() {
  const { user } = useAuth();
  const { school, portalName } = usePortalConfig();
  const { toast } = useToast();
  const [app, setApp] = useState(null);
  const [fee, setFee] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payment, setPayment] = useState({ method: '', transactionId: '', proof: null });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');

  const refreshFees = async (applicationId) => {
    const [enrollmentFee, parentFeeList] = await Promise.all([
      getMyFee(applicationId, user).catch(() => null),
      listParentFees().catch(() => []),
    ]);
    const invoiceViews = (Array.isArray(parentFeeList) ? parentFeeList : [])
      .map(toParentFeeView)
      .filter(Boolean);
    setInvoices(invoiceViews);

    if (isFeeAssigned(enrollmentFee)) {
      setFee(enrollmentFee);
      return enrollmentFee;
    }

    const firstOpenInvoice = invoiceViews.find((inv) => inv.status !== 'verified') || invoiceViews[0] || null;
    setFee(firstOpenInvoice);
    return firstOpenInvoice;
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const application = await getApplicationByParent(user.id).catch(() => null);
        if (cancelled) return;
        setApp(application);
        await refreshFees(application?.id || null);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err?.message || 'Unable to load fee details.');
          setFee(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (user?.id) load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleDownloadReceipt = () => {
    try {
      downloadFeeReceipt(fee, { school, portalName });
      toast('Receipt downloaded. Open the file and use Print → Save as PDF if needed.', 'success');
    } catch (err) {
      toast(err.message || 'Unable to download receipt.', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fee?.id) {
      toast('No fee record available to submit payment against.', 'warning');
      return;
    }
    if (!payment.method || !payment.transactionId) {
      toast('Please complete all required fields before submitting.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await submitPayment(fee.id, {
        method: payment.method,
        transactionId: payment.transactionId,
        proofFileKey: payment.proof?.fileKey || payment.proof?.key || undefined,
      });
      toast('Payment proof submitted successfully.', 'success');
      setPayment({ method: '', transactionId: '', proof: null });
      await refreshFees(app?.id || fee.applicationId || null);
    } catch (err) {
      toast(err?.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const feeStatusBadge = fee?.status === 'verified'
    ? 'fee_verified'
    : fee?.status === 'payment_submitted'
      ? 'fee_submitted'
      : 'fee_pending';

  const showPaymentForm = fee && isFeeAssigned(fee) && fee.status === 'fee_pending' && fee.source !== 'invoice';

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="Fee Submission"
          subtitle="View fee breakdown and submit payment proof."
        />

        {loading ? (
          <LoadingState message="Loading fee details…" />
        ) : loadError ? (
          <div className="sb-card fee-payment-card">
            <p className="fee-payment-empty">{loadError}</p>
          </div>
        ) : !isFeeAssigned(fee) ? (
          <div className="sb-card fee-payment-card">
            <p className="fee-payment-empty">
              Fee has not been assigned yet. Please wait for admin approval.
            </p>
          </div>
        ) : (
          <div className="fee-payment-layout">
            <section className="sb-card fee-payment-card">
              <h3 className="fee-payment-card-title">{fee.title || 'Fee Summary'}</h3>
              <p className="fee-payment-card-sub">
                {fee.studentName || app?.student?.fullName || 'Student'}
                {fee.className ? ` · ${fee.className}` : ''}
                {fee.applicationNo ? ` · ${fee.applicationNo}` : ''}
                {fee.dueDate ? ` · Due ${fee.dueDate}` : ''}
              </p>

              <div className="fee-payment-breakdown">
                {fee.breakdown && Object.entries(fee.breakdown).map(([k, v]) => (
                  <div key={k} className={`fee-payment-row${k === 'discount' ? ' discount' : ''}`}>
                    <span>{formatBreakdownLabel(k)}</span>
                    <span>₹{Number(v || 0).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="fee-payment-row total">
                  <span>Total Payable</span>
                  <span>₹{Number(fee.total || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="fee-payment-status">
                <StatusBadge status={feeStatusBadge} />
              </div>

              {fee.payment?.receiptNo && (
                <div className="fee-payment-receipt">
                  <strong>Receipt Generated: {fee.payment.receiptNo}</strong>
                  <div className="mt-3">
                    <Button variant="outline" size="sm" type="button" onClick={handleDownloadReceipt}>
                      <Download size={14} />
                      Download Receipt
                    </Button>
                  </div>
                </div>
              )}
            </section>

            {showPaymentForm && (
              <section className="sb-card fee-payment-card">
                <h3 className="fee-payment-card-title">Submit Payment Proof</h3>
                <p className="fee-payment-card-sub">
                  Upload your payment details after completing the transfer.
                </p>

                <form className="fee-payment-form" onSubmit={handleSubmit}>
                  <Select
                    label="Payment Method"
                    required
                    options={PAYMENT_METHODS}
                    placeholder="Select payment method"
                    value={payment.method}
                    onChange={(e) => setPayment({ ...payment, method: e.target.value })}
                  />

                  <Input
                    label="Transaction ID"
                    required
                    value={payment.transactionId}
                    onChange={(e) => setPayment({ ...payment, transactionId: e.target.value })}
                    placeholder="Enter transaction ID"
                  />

                  <SmartFileUpload
                    fieldKey="paymentProof"
                    label="Upload Payment Proof"
                    category="paymentProof"
                    value={payment.proof}
                    onChange={(data) => setPayment({ ...payment, proof: data })}
                  />

                  <div className="fee-payment-instructions">
                    <p className="fee-payment-instructions__title">
                      <Building2 size={16} className="text-accent" />
                      Payment Instructions
                    </p>
                    <dl className="fee-payment-instructions__grid">
                      <div className="fee-payment-instructions__item">
                        <dt>Bank</dt>
                        <dd>State Bank of India</dd>
                      </div>
                      <div className="fee-payment-instructions__item">
                        <dt>Account</dt>
                        <dd>{school?.name}</dd>
                      </div>
                      <div className="fee-payment-instructions__item">
                        <dt>IFSC</dt>
                        <dd>SBIN0001234</dd>
                      </div>
                    </dl>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    loading={submitting}
                    className="fee-payment-submit"
                  >
                    <CreditCard size={18} />
                    Submit Payment Proof
                  </Button>
                </form>
              </section>
            )}

            {invoices.length > 1 && (
              <section className="sb-card fee-payment-card fee-payment-layout__full">
                <h3 className="fee-payment-card-title">Other fee invoices</h3>
                <div className="fee-payment-breakdown">
                  {invoices.map((inv) => (
                    <button
                      key={inv.id}
                      type="button"
                      className={`fee-payment-row fee-payment-invoice-row${fee?.id === inv.id ? ' is-active' : ''}`}
                      onClick={() => setFee(inv)}
                    >
                      <span>{inv.applicationNo || inv.id}</span>
                      <span>₹{Number(inv.total || 0).toLocaleString('en-IN')}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </PageTransition>
    </DashboardLayout>
  );
}
