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
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
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
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/5 bg-white text-[#45474c] transition-premium hover:bg-[#f8f9ff] hover:text-[#091426]"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0058be] px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-black/5 bg-white shadow-xl shadow-[#091426]/10">
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
            <strong className="text-sm font-semibold text-[#091426]">Notifications</strong>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleReadAll}
                className="text-xs font-semibold text-[#0058be] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#45474c]">No notifications yet.</div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {notifications.slice(0, 8).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleRead(n.id)}
                  className={`block w-full border-b border-black/5 px-4 py-3 text-left transition-premium hover:bg-[#f8f9ff] ${
                    !n.read ? 'bg-[#dce9ff]/40' : ''
                  }`}
                >
                  <strong className="block text-sm text-[#091426]">{n.title}</strong>
                  <span className="mt-0.5 block text-xs text-[#45474c]">{n.message}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
