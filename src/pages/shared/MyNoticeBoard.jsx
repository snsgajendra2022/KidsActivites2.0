import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { EmptyState, LoadingState, PageHeader } from '../../components/ui/index.jsx';
import NoticeCard from '../../components/notice-board/NoticeCard.jsx';
import NoticeFilters from '../../components/notice-board/NoticeFilters.jsx';
import { useMyNotices } from '../../hooks/useNotices.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import '../../styles/notice-board.css';

export default function MyNoticeBoard({
  title = 'Notice Board',
  subtitle = 'Important announcements from your school.',
  basePath = '/parent/notice-board',
}) {
  const navigate = useNavigate();
  const { tenantPath } = useTenantPath();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const filters = useMemo(() => ({
    search: search || undefined,
    category: category || undefined,
    priority: priority || undefined,
    unreadOnly: unreadOnly ? 'true' : undefined,
  }), [search, category, priority, unreadOnly]);

  const { items, unreadCount, loading } = useMyNotices(filters);

  return (
    <DashboardLayout>
      <div className="notice-board-page">
        <PageHeader
          title={title}
          subtitle={subtitle}
        />

        {unreadCount > 0 && (
          <p className="notice-inbox-unread">{unreadCount} unread notice{unreadCount === 1 ? '' : 's'}</p>
        )}

        <NoticeFilters
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={setCategory}
          priority={priority}
          onPriorityChange={setPriority}
          showStatusTabs={false}
        />

        <label className="notice-inbox-filter">
          <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
          Show unread only
        </label>

        {loading ? (
          <LoadingState message="Loading notices…" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No notices"
            description="When your school shares announcements, they will appear here."
          />
        ) : (
          <div className="notice-board-list">
            {items.map((notice) => (
              <NoticeCard
                key={notice.id}
                notice={notice}
                variant="inbox"
                onView={(n) => navigate(tenantPath(`${basePath}/${n.id}`))}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
