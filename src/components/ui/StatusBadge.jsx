import { STATUS_LABELS } from '../../constants/enrollmentStatuses.js';

const variants = {
  default: 'sb-status-badge sb-status-badge--default',
  primary: 'sb-status-badge sb-status-badge--default',
  success: 'sb-status-badge sb-status-badge--success',
  warning: 'sb-status-badge sb-status-badge--warning',
  danger: 'sb-status-badge sb-status-badge--danger',
  info: 'sb-status-badge sb-status-badge--info',
};

const FEE_STATUS_LABELS = {
  fee_pending: 'Fee Pending',
  not_assigned: 'Not Assigned',
  verified: 'Verified',
  payment_submitted: 'Payment Submitted',
};

const STATUS_VARIANT = {
  draft: 'default',
  submitted: 'info',
  under_review: 'info',
  correction_required: 'warning',
  documents_pending: 'warning',
  documents_verified: 'success',
  fee_pending: 'warning',
  fee_submitted: 'info',
  fee_verified: 'success',
  approved: 'success',
  rejected: 'danger',
  account_created: 'primary',
  admission_confirmed: 'success',
  verified: 'success',
  not_assigned: 'default',
  payment_submitted: 'info',
};

function resolveLabel(status, children) {
  if (children) return children;
  if (!status) return '';
  return STATUS_LABELS[status] || FEE_STATUS_LABELS[status] || status.replace(/_/g, ' ');
}

export default function StatusBadge({ children, status, variant, className = '' }) {
  const label = resolveLabel(status, children);
  const resolvedVariant = variant || STATUS_VARIANT[status] || 'default';

  return (
    <span
      className={`${variants[resolvedVariant] || variants.default} ${className}`}
    >
      {label}
    </span>
  );
}
