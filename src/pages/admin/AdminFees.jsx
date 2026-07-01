import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader, EmptyState } from '../../components/ui/index.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import {
  ResponsiveDataTable,
  TableActionButton,
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

const FEE_COLUMNS = [
  { key: 'applicationNo', label: 'Application No.', primary: true },
  { key: 'studentName', label: 'Student' },
  {
    label: 'Class',
    render: (fee) => fee.classApplying?.toUpperCase(),
  },
  {
    label: 'Total',
    render: (fee) => `₹${fee.total?.toLocaleString()}`,
  },
  {
    label: 'Status',
    badge: true,
    render: (fee) => <StatusBadge status={feeStatusKey(fee.status)} />,
  },
  {
    label: 'Payment',
    muted: true,
    render: (fee) => fee.payment?.transactionId || '—',
  },
];

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

  const renderActions = (fee) => (
    <>
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
    </>
  );

  return (
    <DashboardLayout>
      <PageHeader title="Fees" subtitle="Manage fee assignments, payment verification, and receipts." />

      {fees.length === 0 ? (
        <EmptyState icon={CreditCard} title="No Fee Records Found" description="Fee records will appear here once assigned to applications." />
      ) : (
        <ResponsiveDataTable
          columns={FEE_COLUMNS}
          data={fees}
          minWidth={900}
          renderActions={renderActions}
        />
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
