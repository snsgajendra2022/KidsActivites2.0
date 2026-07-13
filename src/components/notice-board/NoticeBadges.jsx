import {
  NOTICE_CATEGORY_LABELS,
  NOTICE_PRIORITY_LABELS,
  NOTICE_STATUS_LABELS,
} from '../../constants/notices.js';

export function NoticeStatusBadge({ status }) {
  const label = NOTICE_STATUS_LABELS[status] || status;
  const cls = `notice-badge notice-badge--status notice-badge--status-${(status || '').toLowerCase()}`;
  return <span className={cls}>{label}</span>;
}

export function NoticePriorityBadge({ priority }) {
  const label = NOTICE_PRIORITY_LABELS[priority] || priority;
  const cls = `notice-badge notice-badge--priority notice-badge--priority-${(priority || 'normal').toLowerCase()}`;
  return <span className={cls}>{label}</span>;
}

export function NoticeCategoryBadge({ category }) {
  const label = NOTICE_CATEGORY_LABELS[category] || category;
  return <span className="notice-badge notice-badge--category">{label}</span>;
}
