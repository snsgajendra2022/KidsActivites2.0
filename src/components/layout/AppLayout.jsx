import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNetworkStatus } from '../../hooks/useNetworkStatus.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import NetworkBanner from './NetworkBanner.jsx';

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { loginPath } = useTenantPath();
  const location = useLocation();
  const isParentPortal = /\/parent(\/|$)/.test(location.pathname);
  useNetworkStatus();

  const onLogout = () => {
    logout();
    navigate(loginPath);
  };

  return (
    <div className={`flex h-screen overflow-hidden sb-surface text-[var(--sb-on-surface,#243447)] ${isParentPortal ? 'parent-portal-warm' : ''}`}>
      <Sidebar
        user={user}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <NetworkBanner />
        <Header user={user} onMenuClick={() => setSidebarOpen(true)} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
