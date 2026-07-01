import { STATUS_LABELS } from '../../constants/enrollmentStatuses.js';

const variants = {
  default: 'bg-stone-100/80 text-slate-600 ring-stone-200/60',
  primary: 'bg-slate-100/80 text-slate-600 ring-slate-200/60',
  success: 'bg-emerald-50/80 text-emerald-600 ring-emerald-100/80',
  warning: 'bg-amber-50/80 text-amber-600 ring-amber-100/80',
  danger: 'bg-rose-50/80 text-rose-600 ring-rose-100/80',
  info: 'bg-sky-50/80 text-sky-600 ring-sky-100/80',
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
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${variants[resolvedVariant] || variants.default} ${className}`}
    >
      {label}
    </span>
  );
}
