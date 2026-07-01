import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader, EmptyState } from '../../components/ui/index.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import {
  DataTable,
  TableActionButton,
  TableActionCell,
  TablePrimaryCell,
} from '../../components/ui/DataTable.jsx';
import { ConfirmModal } from '../../components/ui/Modal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { getFees, verifyPayment } from '../../services/feeService.js';
import { CreditCard } from 'lucide-react';

function feeStatusKey(status) {
  if (status === 'verified') return 'fee_verified';
  if (status === 'payment_submitted') return 'fee_submitted';
  if (status === 'fee_pending') return 'fee_pending';
  return status;
}

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
        <DataTable minWidth={900}>
          <thead>
            <tr>
              <th>Application No.</th>
              <th>Student</th>
              <th>Class</th>
              <th>Total</th>
              <th>Status</th>
              <th>Payment</th>
              <th className="!text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {fees.map((fee) => (
              <tr key={fee.id}>
                <TablePrimaryCell>{fee.applicationNo}</TablePrimaryCell>
                <td>{fee.studentName}</td>
                <td>{fee.classApplying?.toUpperCase()}</td>
                <td className="whitespace-nowrap">₹{fee.total?.toLocaleString()}</td>
                <td><StatusBadge status={feeStatusKey(fee.status)} /></td>
                <td className="max-w-[160px] truncate text-[#45474c]">
                  {fee.payment?.transactionId || '—'}
                </td>
                <TableActionCell showDash={false}>
                  {fee.status === 'payment_submitted' && (
                    <TableActionButton
                      variant="success"
                      onClick={() => { setSelected(fee); setModal('verify'); }}
                    >
                      Verify Payment
                    </TableActionButton>
                  )}
                  {fee.payment?.receiptNo && (
                    <TableActionButton variant="outline">Download Receipt</TableActionButton>
                  )}
                  {fee.status !== 'payment_submitted' && !fee.payment?.receiptNo && (
                    <span className="text-sm text-[#45474c]/60">—</span>
                  )}
                </TableActionCell>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}

      <ConfirmModal
        open={modal === 'verify'}
        onClose={() => setModal(null)}
        onConfirm={handleVerify}
        title="Verify Fee Payment?"
        message="This will mark the fee as received and generate a receipt."
        confirmText="Verify Payment"
        confirmVariant="success"
        loading={loading}
      />
    </DashboardLayout>
  );
}
