import { useEffect, useMemo, useState } from 'react';
import { Search, CreditCard } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader, EmptyState } from '../../components/ui/index.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Select from '../../components/ui/Select.jsx';
import Button from '../../components/ui/Button.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Modal, { ConfirmModal } from '../../components/ui/Modal.jsx';
import {
  ResponsiveDataTable,
  TableActionButton,
} from '../../components/ui/DataTable.jsx';
import ApplicationViewModal from '../../components/applications/ApplicationViewModal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getFees, verifyPayment, rejectPayment } from '../../services/feeService.js';
import { downloadFeeReceipt } from '../../utils/feeReceipt.js';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';

function feeStatusKey(status) {
  if (status === 'verified') return 'fee_verified';
  if (status === 'payment_submitted') return 'fee_submitted';
  if (status === 'fee_pending') return 'fee_pending';
  return status;
}

const FEE_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'fee_pending', label: 'Fee Pending' },
  { value: 'payment_submitted', label: 'Payment Submitted' },
  { value: 'verified', label: 'Verified' },
  { value: 'not_assigned', label: 'Not Assigned' },
];

const FEE_COLUMNS = [
  { key: 'applicationNo', label: 'Application No.', primary: true },
  { key: 'studentName', label: 'Student' },
  {
    label: 'Class',
    render: (fee) => fee.classApplying?.toUpperCase() || '—',
  },
  {
    label: 'Total',
    render: (fee) => `₹${Number(fee.total || 0).toLocaleString('en-IN')}`,
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
  const [applicationView, setApplicationView] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const { school, portalName } = usePortalConfig();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getFees()
      .then((data) => {
        if (!cancelled) setFees(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) {
          toast('Unable to load fee records. Please try again.', 'error');
          setFees([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => fees.filter((fee) => {
    const query = search.trim().toLowerCase();
    const matchSearch = !query
      || fee.studentName?.toLowerCase().includes(query)
      || fee.applicationNo?.toLowerCase().includes(query)
      || fee.payment?.transactionId?.toLowerCase().includes(query);
    const matchStatus = !statusFilter || fee.status === statusFilter;
    return matchSearch && matchStatus;
  }), [fees, search, statusFilter]);

  const closeModal = () => {
    setModal(null);
    setSelected(null);
    setRejectReason('');
  };

  const closeApplicationView = () => {
    setApplicationView(null);
  };

  const reload = () => {
    setLoading(true);
    return getFees()
      .then((data) => setFees(Array.isArray(data) ? data : []))
      .catch(() => {
        toast('Unable to load fee records. Please try again.', 'error');
        setFees([]);
      })
      .finally(() => setLoading(false));
  };

  const handleVerify = async () => {
    if (!selected?.id) return;
    setActionLoading(true);
    try {
      await verifyPayment(selected.id, user?.name || 'Admin');
      toast('Fee payment verified successfully.', 'success');
      closeModal();
      reload();
    } catch {
      toast('Something went wrong. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selected?.id || !rejectReason.trim()) {
      toast('Please provide a reason for rejection.', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      await rejectPayment(selected.id, rejectReason.trim());
      toast('Payment rejected. Parent can resubmit proof.', 'success');
      closeModal();
      reload();
    } catch {
      toast('Something went wrong. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadReceipt = (fee) => {
    try {
      downloadFeeReceipt(fee, { school, portalName });
      toast('Receipt downloaded.', 'success');
    } catch (err) {
      toast(err.message || 'Unable to download receipt.', 'error');
    }
  };

  const renderActions = (fee) => {
    const applicationId = fee.applicationId;
    return (
    <>
      {applicationId ? (
        <TableActionButton
          variant="outline"
          onClick={() => setApplicationView({ applicationId, feeId: fee.id, fee })}
        >
          View Application
        </TableActionButton>
      ) : (
        <TableActionButton variant="outline" disabled title="Application not linked">
          View Application
        </TableActionButton>
      )}
      {fee.status === 'payment_submitted' && (
        <>
          <TableActionButton
            variant="success"
            onClick={() => { setSelected(fee); setModal('verify'); }}
          >
            Verify Payment
          </TableActionButton>
          <TableActionButton
            variant="danger"
            onClick={() => { setSelected(fee); setModal('reject'); }}
          >
            Reject Payment
          </TableActionButton>
        </>
      )}
      {fee.payment?.receiptNo && (
        <TableActionButton variant="outline" onClick={() => handleDownloadReceipt(fee)}>
          Download Receipt
        </TableActionButton>
      )}
    </>
    );
  };

  return (
    <DashboardLayout>
      <PageHeader title="Fees" subtitle="Manage fee assignments, payment verification, and receipts." />

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#45474c]" />
          <input
            className="input-premium h-11 w-full rounded-lg border border-[#c5c6cd] bg-[#f8f9ff] pl-10 pr-4 text-sm outline-none focus:border-[#0058be] focus:shadow-[0_0_0_4px_rgba(0,88,190,0.1)]"
            placeholder="Search by student, application no., or transaction ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          options={FEE_STATUS_OPTIONS}
          placeholder="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="min-w-[200px]"
          variant="enrollment"
        />
      </div>

      {loading ? (
        <div className="sb-card p-8 text-center text-sm text-[#45474c]/70">Loading fee records…</div>
      ) : fees.length === 0 ? (
        <EmptyState icon={CreditCard} title="No Fee Records Found" description="Fee records will appear here once assigned to applications." />
      ) : (
        <ResponsiveDataTable
          columns={FEE_COLUMNS}
          data={filtered}
          minWidth={1000}
          emptyMessage="No fee records match your filters."
          renderActions={renderActions}
        />
      )}

      <ConfirmModal
        open={modal === 'verify'}
        onClose={closeModal}
        onConfirm={handleVerify}
        title="Verify Fee Payment?"
        message="This will mark the fee as received and generate a receipt."
        confirmText="Verify Payment"
        confirmVariant="success"
        loading={actionLoading}
      />

      <Modal
        open={modal === 'reject'}
        onClose={closeModal}
        title="Reject Payment?"
        footer={(
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button variant="danger" loading={actionLoading} onClick={handleReject}>Reject Payment</Button>
          </>
        )}
      >
        <Textarea
          label="Reason for rejection"
          required
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Explain what needs to be corrected so the parent can resubmit payment proof."
        />
      </Modal>

      <ApplicationViewModal
        open={Boolean(applicationView?.applicationId)}
        onClose={closeApplicationView}
        applicationId={applicationView?.applicationId}
        feeId={applicationView?.feeId}
        feeRecord={applicationView?.fee}
        onFeeUpdated={() => reload()}
      />
    </DashboardLayout>
  );
}
