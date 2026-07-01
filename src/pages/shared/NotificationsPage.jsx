import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { EmptyState } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getNotifications, markAsRead, markAllRead } from '../../services/notificationService.js';

function typeLabel(type) {
  const labels = {
    enrollment: 'Enrollment',
    fee: 'Fees',
    photo: 'Photos',
    chat: 'Messages',
    system: 'System',
  };
  return labels[type] || 'Update';
}

export default function NotificationsPage({ title = 'Notifications', subtitle = 'Your school notifications and updates.' }) {
  const { user, isDemoSession } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    getNotifications(user.id)
      .then(setNotifications)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const unread = notifications.filter((n) => !n.read).length;

  const handleRead = async (id) => {
    await markAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleReadAll = async () => {
    await markAllRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <DashboardLayout>
      <PageHeader
        title={title}
        subtitle={(
          <>
            {subtitle}
            {isDemoSession && (
              <span className="ml-2 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                Demo data
              </span>
            )}
          </>
        )}
        actions={unread > 0 ? (
          <button type="button" onClick={handleReadAll} className="table-action-btn table-action-btn-outline">
            <CheckCheck size={16} />
            Mark all read
          </button>
        ) : null}
      />

      {loading ? (
        <div className="sb-card p-6 text-sm text-[#45474c]">Loading notifications…</div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Updates about enrollment, fees, photos, and messages will appear here."
        />
      ) : (
        <div className="notifications-page-list">
          {notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => !n.read && handleRead(n.id)}
              className={`notifications-page-item${!n.read ? ' notifications-page-item--unread' : ''}`}
            >
              <div className="notifications-page-item__head">
                <strong>{n.title}</strong>
                <span className="notifications-page-item__type">{typeLabel(n.type)}</span>
              </div>
              <p>{n.message}</p>
              <time>{new Date(n.createdAt).toLocaleString()}</time>
            </button>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
