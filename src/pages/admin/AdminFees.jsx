import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader, EmptyState } from '../../components/ui/index.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import { ConfirmModal } from '../../components/ui/Modal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { getFees, verifyPayment, rejectPayment } from '../../services/feeService.js';
import { CreditCard } from 'lucide-react';

export default function AdminFees() {
  const [fees, setFees] = useState([]);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const load = () => getFees().then(setFees);
  useEffect(() => { load(); }, []);

  const handleVerify = async () => {
    setLoading(true);
    try {
      await verifyPayment(selected.id, 'Priya Sharma');
      toast('Fee payment verified successfully.', 'success');
      setModal(null);
      load();
    } catch {
      toast('Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Fees" subtitle="Manage fee assignments, payment verification, and receipts." />

      {fees.length === 0 ? (
        <EmptyState icon={CreditCard} title="No Fee Records Found" description="Fee records will appear here once assigned to applications." />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Application No.</th>
                <th>Student</th>
                <th>Class</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((fee) => (
                <tr key={fee.id}>
                  <td>{fee.applicationNo}</td>
                  <td>{fee.studentName}</td>
                  <td>{fee.classApplying?.toUpperCase()}</td>
                  <td>₹{fee.total?.toLocaleString()}</td>
                  <td><StatusBadge status={fee.status === 'verified' ? 'fee_verified' : fee.status === 'payment_submitted' ? 'fee_submitted' : 'fee_pending'} /></td>
                  <td>{fee.payment?.transactionId || '—'}</td>
                  <td className="table-actions">
                    {fee.status === 'payment_submitted' && (
                      <Button variant="success" size="sm" onClick={() => { setSelected(fee); setModal('verify'); }}>Verify Payment</Button>
                    )}
                    {fee.payment?.receiptNo && (
                      <Button variant="outline" size="sm">Download Receipt</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal open={modal === 'verify'} onClose={() => setModal(null)} onConfirm={handleVerify} title="Verify Fee Payment?" message="This will mark the fee as received and generate a receipt." confirmText="Verify Payment" confirmVariant="success" loading={loading} />
    </DashboardLayout>
  );
}
