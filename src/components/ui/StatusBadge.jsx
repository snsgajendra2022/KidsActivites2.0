import { STATUS_BADGE_CLASS, STATUS_LABELS } from '../../constants/enrollmentStatuses.js';

export default function StatusBadge({ status }) {
  const label = STATUS_LABELS[status] || status;
  const className = STATUS_BADGE_CLASS[status] || 'badge-draft';
  return <span className={`badge ${className}`}>{label}</span>;
}
