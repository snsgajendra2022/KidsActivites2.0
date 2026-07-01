import { useEffect, useState } from 'react';
import { Building2, CreditCard, Download } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import SmartFileUpload from '../../components/upload/SmartFileUpload.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { getApplicationByParent } from '../../services/enrollmentService.js';
import { getFeeByApplication, submitPayment } from '../../services/feeService.js';
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

export default function ParentFees() {
  const { user } = useAuth();
  const { school, portalName } = usePortalConfig();
  const { toast } = useToast();
  const [app, setApp] = useState(null);
  const [fee, setFee] = useState(null);
  const [payment, setPayment] = useState({ method: '', transactionId: '', proof: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getApplicationByParent(user.id).then(async (data) => {
      setApp(data);
      if (data) setFee(await getFeeByApplication(data.id));
    });
  }, [user.id]);

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
    if (!payment.method || !payment.transactionId) {
      toast('Please complete all required fields before submitting.', 'warning');
      return;
    }
    setLoading(true);
    try {
      await submitPayment(fee.id, { method: payment.method, transactionId: payment.transactionId });
      toast('Payment proof submitted successfully.', 'success');
      setFee(await getFeeByApplication(app.id));
    } catch {
      toast('Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const feeStatusBadge = fee?.status === 'verified'
    ? 'fee_verified'
    : fee?.status === 'payment_submitted'
      ? 'fee_submitted'
      : 'fee_pending';

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="Fee Submission"
          subtitle="View fee breakdown and submit payment proof."
        />

        {!fee || fee.status === 'not_assigned' ? (
          <div className="sb-card fee-payment-card">
            <p className="fee-payment-empty">
              Fee has not been assigned yet. Please wait for admin approval.
            </p>
          </div>
        ) : (
          <div className="fee-payment-layout">
            <section className="sb-card fee-payment-card">
              <h3 className="fee-payment-card-title">Fee Summary</h3>
              <p className="fee-payment-card-sub">
                {app?.student?.fullName} · {fee.applicationNo}
              </p>

              <div className="fee-payment-breakdown">
                {fee.breakdown && Object.entries(fee.breakdown).map(([k, v]) => (
                  <div key={k} className={`fee-payment-row${k === 'discount' ? ' discount' : ''}`}>
                    <span>{formatBreakdownLabel(k)}</span>
                    <span>₹{v.toLocaleString()}</span>
                  </div>
                ))}
                <div className="fee-payment-row total">
                  <span>Total Payable</span>
                  <span>₹{fee.total?.toLocaleString()}</span>
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

            {fee.status === 'fee_pending' && (
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
                    loading={loading}
                    className="fee-payment-submit"
                  >
                    <CreditCard size={18} />
                    Submit Payment Proof
                  </Button>
                </form>
              </section>
            )}
          </div>
        )}
      </PageTransition>
    </DashboardLayout>
  );
}
