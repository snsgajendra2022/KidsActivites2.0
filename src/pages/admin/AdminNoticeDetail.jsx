import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { LoadingState, PageHeader } from '../../components/ui/index.jsx';
import { ResponsiveDataTable } from '../../components/ui/DataTable.jsx';
import { NoticeCategoryBadge, NoticePriorityBadge, NoticeStatusBadge } from '../../components/notice-board/NoticeBadges.jsx';
import NoticeAnalytics from '../../components/notice-board/NoticeAnalytics.jsx';
import { useNoticeDetail, useNoticeMutations } from '../../hooks/useNotices.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { NOTICE_STATUS } from '../../constants/notices.js';
import '../../styles/notice-board.css';

const RECIPIENT_COLUMNS = [
  { label: 'Name', key: 'name', primary: true },
  { label: 'Role', key: 'role' },
  {
    label: 'Read',
    accessor: (r) => (r.readAt ? new Date(r.readAt).toLocaleString() : '—'),
    muted: true,
  },
  {
    label: 'Acknowledged',
    accessor: (r) => (r.acknowledgedAt ? new Date(r.acknowledgedAt).toLocaleString() : '—'),
    muted: true,
  },
];

export default function AdminNoticeDetail() {
  const { noticeId } = useParams();
  const navigate = useNavigate();
  const { tenantPath } = useTenantPath();
  const { notice, loading, reload } = useNoticeDetail(noticeId);
  const { getAnalytics, getRecipients } = useNoticeMutations();
  const [analytics, setAnalytics] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    if (!noticeId) return;
    setAnalyticsLoading(true);
    Promise.all([getAnalytics(noticeId), getRecipients(noticeId)])
      .then(([a, r]) => {
        setAnalytics(a);
        setRecipients(r?.items || []);
      })
      .finally(() => setAnalyticsLoading(false));
  }, [noticeId, notice?.readCount]);

  if (loading) {
    return <DashboardLayout><LoadingState message="Loading notice…" /></DashboardLayout>;
  }

  if (!notice) {
    return (
      <DashboardLayout>
        <p>Notice not found.</p>
        <Link to={tenantPath('/admin/notice-board')}>Back to Notice Board</Link>
      </DashboardLayout>
    );
  }

  const canEdit = notice.status === NOTICE_STATUS.DRAFT || notice.status === NOTICE_STATUS.SCHEDULED;

  return (
    <DashboardLayout>
      <div className="notice-detail-page">
        <Link to={tenantPath('/admin/notice-board')} className="notice-back-link">
          <ArrowLeft size={16} /> Back to Notice Board
        </Link>

        <PageHeader
          title={notice.title}
          subtitle={notice.audienceSummary}
          actions={canEdit ? (
            <Link to={tenantPath(`/admin/notice-board/${notice.id}/edit`)} className="sb-button-secondary">
              <Edit size={16} /> Edit
            </Link>
          ) : null}
        />

        <div className="notice-detail-badges">
          <NoticeCategoryBadge category={notice.category} />
          <NoticePriorityBadge priority={notice.priority} />
          <NoticeStatusBadge status={notice.status} />
        </div>

        <div className="notice-detail-meta">
          <span>By {notice.createdByName || 'Admin'}</span>
          {notice.publishedAt && <span>Published {new Date(notice.publishedAt).toLocaleString()}</span>}
          {notice.expiresAt && <span>Expires {new Date(notice.expiresAt).toLocaleString()}</span>}
        </div>

        <article className="notice-detail-body">
          <p>{notice.body}</p>
        </article>

        {notice.status === NOTICE_STATUS.PUBLISHED && (
          <>
            <NoticeAnalytics analytics={analytics} loading={analyticsLoading} />
            <section className="notice-recipients-section">
              <h3>Recipients ({recipients.length})</h3>
              <ResponsiveDataTable
                columns={RECIPIENT_COLUMNS}
                data={recipients}
                keyExtractor={(r) => r.id}
                emptyMessage="No recipients yet."
                minWidth={640}
              />
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
