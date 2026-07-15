import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { LoadingState } from '../../components/ui/index.jsx';
import { NoticeCategoryBadge, NoticePriorityBadge } from '../../components/notice-board/NoticeBadges.jsx';
import { useMyNoticeDetail, useNoticeMutations } from '../../hooks/useNotices.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { useToast } from '../../context/ToastContext.jsx';
import '../../styles/notice-board.css';

export default function MyNoticeDetail({ backPath = '/parent/notice-board' }) {
  const { noticeId } = useParams();
  const { tenantPath } = useTenantPath();
  const { toast } = useToast();
  const { notice, loading } = useMyNoticeDetail(noticeId);
  const { markRead, acknowledge } = useNoticeMutations();

  useEffect(() => {
    if (noticeId && notice && !notice.readAt) {
      markRead(noticeId).catch(() => {});
    }
  }, [noticeId, notice?.readAt]);

  const handleAcknowledge = async () => {
    try {
      await acknowledge(noticeId);
      toast('Notice acknowledged', 'success');
      window.location.reload();
    } catch (err) {
      toast(err.message || 'Unable to acknowledge', 'error');
    }
  };

  if (loading) {
    return <DashboardLayout><LoadingState message="Loading notice…" /></DashboardLayout>;
  }

  if (!notice) {
    return (
      <DashboardLayout>
        <p>Notice not found or you do not have access.</p>
        <Link to={tenantPath(backPath)}>Back to Notice Board</Link>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="notice-detail-page notice-detail-page--inbox">
        <Link to={tenantPath(backPath)} className="notice-back-link">
          <ArrowLeft size={16} /> Back to Notice Board
        </Link>

        <div className="notice-detail-badges">
          <NoticeCategoryBadge category={notice.category} />
          <NoticePriorityBadge priority={notice.priority} />
        </div>

        <h1 className="notice-detail-title">{notice.title}</h1>
        <p className="notice-detail-meta">
          Published {notice.publishedAt ? new Date(notice.publishedAt).toLocaleString() : '—'}
        </p>

        <article className="notice-detail-body">
          <p>{notice.body}</p>
        </article>

        {notice.requiresAcknowledgement && !notice.acknowledgedAt && (
          <button type="button" className="sb-button-primary notice-ack-btn" onClick={handleAcknowledge}>
            <CheckCircle size={18} /> Acknowledge notice
          </button>
        )}

        {notice.acknowledgedAt && (
          <p className="notice-ack-done">Acknowledged on {new Date(notice.acknowledgedAt).toLocaleString()}</p>
        )}
      </div>
    </DashboardLayout>
  );
}
