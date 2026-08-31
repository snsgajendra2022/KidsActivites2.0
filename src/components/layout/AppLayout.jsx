import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNetworkStatus } from '../../hooks/useNetworkStatus.js';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import NetworkBanner from './NetworkBanner.jsx';
import WebPushEnableBanner from '../notifications/WebPushEnableBanner.jsx';
import EmergencyCalendarBanner from '../calendar/EmergencyCalendarBanner.jsx';
import '../../styles/notifications.css';

const SIDEBAR_COLLAPSE_KEY = 'ka.sidebar.collapsed';
/** Collapse rail below this width so map / content pages keep usable main width. */
const AUTO_COLLAPSE_MAX_WIDTH = 1279;

function readPersistedCollapsed() {
  try {
    const raw = localStorage.getItem(SIDEBAR_COLLAPSE_KEY);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    return window.innerWidth <= AUTO_COLLAPSE_MAX_WIDTH;
  }
  return false;
}

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readPersistedCollapsed);
  const [userPinned, setUserPinned] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSE_KEY) != null;
    } catch {
      return false;
    }
  });
  useNetworkStatus();

  useEffect(() => {
    const onResize = () => {
      if (userPinned) return;
      setCollapsed(window.innerWidth <= AUTO_COLLAPSE_MAX_WIDTH);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [userPinned]);

  const onToggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      setUserPinned(true);
      try {
        localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="portal-shell flex overflow-hidden sb-surface text-[var(--sb-on-surface,#111827)]">
      <Sidebar
        user={user}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <NetworkBanner />
        <Header user={user} onMenuClick={() => setSidebarOpen(true)} onLogout={onLogout} />
        <main className="min-h-0 flex-1 min-w-0 overflow-x-clip overflow-y-auto p-3 sm:p-4 lg:p-6 xl:p-8">
          {/* Post-login: permission prompt / retry when FCM token never landed in localStorage */}
          {user?.id ? <WebPushEnableBanner compact /> : null}
          {user?.id ? <EmergencyCalendarBanner /> : null}
          {children}
        </main>
      </div>
    </div>
  );
}
