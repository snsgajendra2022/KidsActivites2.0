import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
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

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'cash', label: 'Cash' },
];

export default function ParentFees() {
  const { user } = useAuth();
  const { school } = usePortalConfig();
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

  const handleSubmit = async () => {
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

  return (
    <DashboardLayout>
      <PageHeader title="Fee Submission" subtitle="View fee breakdown and submit payment proof." />

      {!fee || fee.status === 'not_assigned' ? (
        <div className="card"><p className="text-muted">Fee has not been assigned yet. Please wait for admin approval.</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="card">
            <h3 className="card-title">Fee Summary</h3>
            <p className="text-muted" style={{ marginBottom: 16 }}>{app?.student?.fullName} · {fee.applicationNo}</p>
            <div className="fee-breakdown">
              {fee.breakdown && Object.entries(fee.breakdown).map(([k, v]) => (
                <div key={k} className={`fee-row ${k === 'discount' ? 'discount' : ''}`}>
                  <span>{k.replace(/([A-Z])/g, ' $1')}</span>
                  <span>₹{v.toLocaleString()}</span>
                </div>
              ))}
              <div className="fee-row total"><span>Total Payable</span><span>₹{fee.total?.toLocaleString()}</span></div>
            </div>
            <div style={{ marginTop: 16 }}><StatusBadge status={fee.status === 'verified' ? 'fee_verified' : fee.status === 'payment_submitted' ? 'fee_submitted' : 'fee_pending'} /></div>
            {fee.payment?.receiptNo && (
              <div style={{ marginTop: 16, padding: 16, background: 'var(--success-light)', borderRadius: 12 }}>
                <strong>Receipt Generated: {fee.payment.receiptNo}</strong>
                <div style={{ marginTop: 8 }}><Button variant="outline" size="sm">Download Receipt</Button></div>
              </div>
            )}
          </div>

          {fee.status === 'fee_pending' && (
            <div className="card">
              <h3 className="card-title">Submit Payment Proof</h3>
              <Select label="Payment Method" required options={PAYMENT_METHODS} placeholder="Select payment method" value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })} />
              <Input label="Transaction ID" required value={payment.transactionId} onChange={(e) => setPayment({ ...payment, transactionId: e.target.value })} placeholder="Enter transaction ID" />
              <SmartFileUpload fieldKey="paymentProof" label="Upload Payment Proof" category="paymentProof" value={payment.proof} onChange={(data) => setPayment({ ...payment, proof: data })} />
              <div style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>
                <strong>Payment Instructions:</strong><br />
                Bank: State Bank of India<br />
                Account: {school?.name}<br />
                IFSC: SBIN0001234
              </div>
              <Button variant="primary" loading={loading} onClick={handleSubmit} style={{ marginTop: 16, width: '100%' }}>Submit Payment Proof</Button>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
