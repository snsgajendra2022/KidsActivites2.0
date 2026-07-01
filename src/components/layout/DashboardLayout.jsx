import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { NAV_BY_ROLE } from '../../constants/navigation.js';
import { ROLE_LABELS } from '../../constants/roles.js';
import { SCHOOL } from '../../data/mockSchool.js';
import NotificationBell from '../notifications/NotificationBell.jsx';

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navItems = NAV_BY_ROLE[user?.role] || [];

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <Link to={user?.role?.includes('admin') ? '/admin/dashboard' : user?.role === 'teacher' ? '/teacher/dashboard' : '/parent/dashboard'} className="sidebar-brand">
          <span className="sidebar-brand-icon">SB</span>
          <span>SchoolBridge</span>
        </Link>
        <nav>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div>{SCHOOL.name}</div>
          <div>{SCHOOL.academicYear}</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="btn btn-ghost btn-icon mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="topbar-title">{SCHOOL.academicYear}</div>
          <div className="topbar-actions">
            <NotificationBell />
            <div className="user-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 14px', minHeight: 40, borderRadius: 999, border: '1px solid var(--line)', background: '#fff', fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{user?.name}</span>
              <span className="text-small">({ROLE_LABELS[user?.role]})</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onLogout}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
