import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_DASHBOARD } from '../../constants/roles.js';
import { getNotifications, markAsRead, markAllRead } from '../../services/notificationService.js';

const NOTIFICATIONS_PATH = {
  school_admin: '/admin/notifications',
  super_admin: '/admin/notifications',
  admission_officer: '/admin/notifications',
  accountant: '/admin/notifications',
  support_staff: '/admin/notifications',
  parent: '/parent/notifications',
  student: '/parent/notifications',
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!user?.id) return undefined;

    let cancelled = false;
    getNotifications(user.id)
      .then(({ notifications: items, unreadCount: count }) => {
        if (cancelled) return;
        setNotifications(Array.isArray(items) ? items : []);
        setUnreadCount(Number.isFinite(count) ? count : 0);
      })
      .catch(() => {
        if (!cancelled) {
          setNotifications([]);
          setUnreadCount(0);
        }
      });

    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const unread = unreadCount;
  const notificationsPath = NOTIFICATIONS_PATH[user?.role] || ROLE_DASHBOARD[user?.role] || '/';

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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="notif-bell-btn"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="notif-bell-badge">{unread}</span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="notif-backdrop md:hidden"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div className="notif-dropdown-panel" role="dialog" aria-label="Notifications">
            <div className="notif-dropdown-header">
              <strong className="notif-dropdown-title">Notifications</strong>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={handleReadAll}
                  className="notif-dropdown-mark-all"
                >
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="notif-dropdown-empty">No notifications yet.</div>
            ) : (
              <div className="notif-dropdown-list">
                {notifications.slice(0, 8).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => !n.read && handleRead(n.id)}
                    className={`notif-dropdown-item${!n.read ? ' notif-dropdown-item--unread' : ''}`}
                  >
                    <strong className="notif-dropdown-item-title">{n.title}</strong>
                    <span className="notif-dropdown-item-message">{n.message}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="notif-dropdown-footer">
              <Link
                to={notificationsPath}
                className="notif-dropdown-view-all"
                onClick={() => setOpen(false)}
              >
                View all notifications
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
