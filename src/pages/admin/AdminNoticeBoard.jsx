import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Megaphone, Plus } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { EmptyState, LoadingState, PageHeader } from '../../components/ui/index.jsx';
import NoticeCard from '../../components/notice-board/NoticeCard.jsx';
import NoticeFilters from '../../components/notice-board/NoticeFilters.jsx';
import { useNotices, useNoticeMutations } from '../../hooks/useNotices.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { useToast } from '../../context/ToastContext.jsx';
import { NOTICE_STATUS } from '../../constants/notices.js';
import '../../styles/notice-board.css';

export default function AdminNoticeBoard() {
  const navigate = useNavigate();
  const { tenantPath } = useTenantPath();
  const { toast } = useToast();
  const { archiveNotice, deleteNotice, duplicateNotice } = useNoticeMutations();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');

  const filters = useMemo(() => ({
    search: search || undefined,
    status: status || undefined,
    category: category || undefined,
    priority: priority || undefined,
  }), [search, status, category, priority]);

  const { items, loading, reload } = useNotices(filters);

  const stats = useMemo(() => ({
    published: items.filter((n) => n.status === NOTICE_STATUS.PUBLISHED).length,
    draft: items.filter((n) => n.status === NOTICE_STATUS.DRAFT).length,
    scheduled: items.filter((n) => n.status === NOTICE_STATUS.SCHEDULED).length,
    important: items.filter((n) => n.priority === 'IMPORTANT' || n.priority === 'URGENT').length,
  }), [items]);

  const handleArchive = async (notice) => {
    if (!window.confirm(`Archive "${notice.title}"?`)) return;
    try {
      await archiveNotice(notice.id);
      toast('Notice archived', 'success');
      reload();
    } catch (err) {
      toast(err.message || 'Unable to archive notice', 'error');
    }
  };

  const handleDelete = async (notice) => {
    if (!window.confirm(`Delete draft "${notice.title}"? This cannot be undone.`)) return;
    try {
      await deleteNotice(notice.id);
      toast('Draft deleted', 'success');
      reload();
    } catch (err) {
      toast(err.message || 'Unable to delete notice', 'error');
    }
  };

  const handleDuplicate = async (notice) => {
    try {
      const copy = await duplicateNotice(notice.id);
      toast('Notice duplicated as draft', 'success');
      navigate(tenantPath(`/admin/notice-board/${copy.id}/edit`));
    } catch (err) {
      toast(err.message || 'Unable to duplicate notice', 'error');
    }
  };

  return (
    <DashboardLayout>
      <div className="notice-board-page">
        <PageHeader
          title="Notice Board"
          subtitle="Create and broadcast announcements to parents, teachers, and staff."
          actions={(
            <Link to={tenantPath('/admin/notice-board/new')} className="sb-button-primary notice-board-create-btn">
              <Plus size={18} /> Create Notice
            </Link>
          )}
        />

        <div className="notice-board-stats">
          <div className="notice-board-stat"><span>{stats.published}</span><small>Published</small></div>
          <div className="notice-board-stat"><span>{stats.draft}</span><small>Drafts</small></div>
          <div className="notice-board-stat"><span>{stats.scheduled}</span><small>Scheduled</small></div>
          <div className="notice-board-stat"><span>{stats.important}</span><small>Important</small></div>
        </div>

        <NoticeFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          category={category}
          onCategoryChange={setCategory}
          priority={priority}
          onPriorityChange={setPriority}
        />

        {loading ? (
          <LoadingState message="Loading notices…" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No notices yet"
            description="Create your first school announcement and send it to the right audience."
            action={(
              <Link to={tenantPath('/admin/notice-board/new')} className="sb-button-primary">
                Create Notice
              </Link>
            )}
          />
        ) : (
          <div className="notice-board-list">
            {items.map((notice) => (
              <NoticeCard
                key={notice.id}
                notice={notice}
                variant="admin"
                onView={(n) => navigate(tenantPath(`/admin/notice-board/${n.id}`))}
                onEdit={(n) => navigate(tenantPath(`/admin/notice-board/${n.id}/edit`))}
                onDuplicate={handleDuplicate}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
