import { MoreHorizontal, Pin } from 'lucide-react';
import { NoticeCategoryBadge, NoticePriorityBadge, NoticeStatusBadge } from './NoticeBadges.jsx';
import NoticeActionsMenu from './NoticeActionsMenu.jsx';

export default function NoticeCard({
  notice,
  variant = 'admin',
  onView,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
}) {
  const isUnread = variant === 'inbox' && !notice.readAt;

  return (
    <article className={`notice-card ${isUnread ? 'notice-card--unread' : ''}`}>
      <div className="notice-card__main">
        <div className="notice-card__badges">
          {notice.isPinned && <span className="notice-card__pin" title="Pinned"><Pin size={14} /></span>}
          <NoticeCategoryBadge category={notice.category} />
          <NoticePriorityBadge priority={notice.priority} />
          {variant === 'admin' && <NoticeStatusBadge status={notice.status} />}
        </div>
        <button type="button" className="notice-card__title" onClick={() => onView?.(notice)}>
          {notice.title}
        </button>
        <p className="notice-card__meta">
          {variant === 'admin' ? (
            <>
              <span>{notice.audienceSummary}</span>
              <span>·</span>
              <span>{notice.recipientCount || 0} recipients</span>
              {notice.status === 'PUBLISHED' && (
                <>
                  <span>·</span>
                  <span>{notice.readCount || 0} read</span>
                </>
              )}
            </>
          ) : (
            <>
              <span>{new Date(notice.publishedAt).toLocaleDateString()}</span>
              {notice.requiresAcknowledgement && !notice.acknowledgedAt && (
                <>
                  <span>·</span>
                  <span className="notice-card__ack-required">Acknowledgement required</span>
                </>
              )}
            </>
          )}
        </p>
        {notice.body && (
          <p className="notice-card__preview">{notice.body.slice(0, 120)}{notice.body.length > 120 ? '…' : ''}</p>
        )}
      </div>
      {variant === 'admin' && (
        <NoticeActionsMenu
          notice={notice}
          onView={onView}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onArchive={onArchive}
          onDelete={onDelete}
          trigger={(
            <button type="button" className="notice-card__menu-btn" aria-label="Notice actions">
              <MoreHorizontal size={18} />
            </button>
          )}
        />
      )}
      {isUnread && <span className="notice-card__unread-dot" aria-label="Unread" />}
    </article>
  );
}
