import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getNotifications, markAsRead, markAllRead } from '../../services/notificationService.js';

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    if (user) getNotifications(user.id).then(setNotifications);
  }, [user]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="btn btn-ghost btn-icon" onClick={() => setOpen(!open)} aria-label="Notifications">
        <Bell size={20} />
        {unread > 0 && <span className="notif-badge">{unread}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)' }}>
            <strong style={{ fontSize: 14 }}>Notifications</strong>
            {unread > 0 && <button className="btn btn-ghost btn-sm" onClick={handleReadAll}>Mark all read</button>}
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>No notifications yet.</div>
          ) : (
            notifications.slice(0, 8).map((n) => (
              <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`} onClick={() => handleRead(n.id)}>
                <strong>{n.title}</strong>
                <span style={{ color: 'var(--muted)' }}>{n.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
