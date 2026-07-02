import { useEffect, useState, useMemo } from 'react';
import {
  Bell, CheckCheck, FileText, CreditCard, Image, MessageCircle,
  Inbox, Filter,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { getNotifications, markAsRead, markAllRead } from '../../services/notificationService.js';
import '../../styles/notifications.css';

const TYPE_CONFIG = {
  enrollment: { label: 'Enrollment', icon: FileText, filter: 'enrollment' },
  fee: { label: 'Fees', icon: CreditCard, filter: 'fee' },
  photo: { label: 'Photos', icon: Image, filter: 'photo' },
  chat: { label: 'Messages', icon: MessageCircle, filter: 'chat' },
  system: { label: 'System', icon: Bell, filter: 'system' },
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'enrollment', label: 'Enrollment' },
  { id: 'fee', label: 'Fees' },
  { id: 'photo', label: 'Photos' },
  { id: 'chat', label: 'Messages' },
  { id: 'system', label: 'System' },
];

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function NotificationsPage({
  title = 'Notifications',
  subtitle = 'Your school notifications and updates.',
}) {
  const { user, isDemoSession } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (!user?.id) return undefined;

    let cancelled = false;
    setLoading(true);

    getNotifications(user.id)
      .then(({ notifications: items, unreadCount: count }) => {
        if (cancelled) return;
        setNotifications(Array.isArray(items) ? items : []);
        setUnreadCount(Number.isFinite(count) ? count : 0);
      })
      .catch(() => {
        if (!cancelled) {
          toast('Unable to load notifications. Please try again.', 'error');
          setNotifications([]);
          setUnreadCount(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [user?.id]);

  const unread = unreadCount;

  const filterCounts = useMemo(() => {
    const counts = { all: notifications.length, unread };
    FILTERS.slice(2).forEach((f) => {
      counts[f.id] = notifications.filter((n) => n.type === f.id).length;
    });
    return counts;
  }, [notifications, unread]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    if (activeFilter === 'unread') return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.type === activeFilter);
  }, [notifications, activeFilter]);

  const handleRead = async (id) => {
    await markAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleReadAll = async () => {
    await markAllRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const filterLabel = FILTERS.find((f) => f.id === activeFilter)?.label || 'All';

  return (
    <DashboardLayout>
      <div className="notif-shell">
        <div className="notif-panel">
          <aside className="notif-sidebar">
            <div className="notif-sidebar__head">
              <div className="notif-sidebar__title-row">
                <h1 className="notif-sidebar__title">{title}</h1>
                {isDemoSession && (
                  <span className="notif-demo-badge">Demo</span>
                )}
              </div>
              <p className="notif-sidebar__subtitle">{subtitle}</p>

              <div className="notif-stat-card">
                <div className="notif-stat-card__icon">
                  <Bell size={18} />
                </div>
                <div className="notif-stat-card__text">
                  <strong>{unread}</strong>
                  <span>unread notification{unread !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            <nav className="notif-filters" aria-label="Filter notifications">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`notif-filter-btn ${activeFilter === f.id ? 'is-active' : ''}`}
                  onClick={() => setActiveFilter(f.id)}
                >
                  {f.label}
                  {filterCounts[f.id] > 0 && (
                    <span className="notif-filter-btn__count">{filterCounts[f.id]}</span>
                  )}
                </button>
              ))}
            </nav>

            <div className="notif-sidebar__action">
              <button
                type="button"
                className="notif-mark-all"
                onClick={handleReadAll}
                disabled={unread === 0}
              >
                <CheckCheck size={16} />
                Mark all as read
              </button>
            </div>
          </aside>

          <div className="notif-main">
            <div className="notif-main__toolbar">
              <div>
                <h2>
                  <Inbox size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
                  {filterLabel}
                </h2>
                <p>
                  {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
                  {activeFilter === 'unread' && unread > 0 ? ' needing attention' : ''}
                </p>
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  className="notif-mark-all md:hidden"
                  onClick={handleReadAll}
                  style={{ width: 'auto', minHeight: '2.25rem', padding: '0 0.875rem' }}
                >
                  <CheckCheck size={15} />
                  Mark all read
                </button>
              )}
            </div>

            {loading ? (
              <div className="notif-loading">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="notif-skeleton" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty__icon">
                  <Filter size={28} strokeWidth={1.75} />
                </div>
                <h2>
                  {notifications.length === 0 ? 'No notifications yet' : 'Nothing in this filter'}
                </h2>
                <p>
                  {notifications.length === 0
                    ? 'Updates about enrollment, fees, photos, and messages will appear here.'
                    : 'Try another category or check back later for new updates.'}
                </p>
              </div>
            ) : (
              <div className="notif-feed">
                {filtered.map((n) => {
                  const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
                  const Icon = config.icon;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      className={`notif-card ${!n.read ? 'notif-card--unread' : ''}`}
                      onClick={() => !n.read && handleRead(n.id)}
                    >
                      <div className={`notif-card__icon notif-card__icon--${n.type}`}>
                        <Icon size={20} />
                      </div>
                      <div className="notif-card__body">
                        <div className="notif-card__head">
                          <h3 className="notif-card__title">{n.title}</h3>
                          <div className="notif-card__meta">
                            {!n.read && <span className="notif-card__dot" aria-label="Unread" />}
                            <time className="notif-card__time">{formatTime(n.createdAt)}</time>
                          </div>
                        </div>
                        <p className="notif-card__message">{n.message}</p>
                        <span className="notif-card__tag">{config.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
