import { Link, NavLink } from 'react-router-dom';
import { ChevronLeft, X } from 'lucide-react';
import { NAV_BY_ROLE } from '../../constants/navigation.js';
import { ROLE_LABELS, ROLE_DASHBOARD } from '../../constants/roles.js';
import { SCHOOL } from '../../data/mockSchool.js';

function sidebarLinkClass({ isActive }) {
  if (isActive) {
    return [
      'sidebar-nav-link sidebar-nav-link-active',
      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold',
      'bg-[#091426] text-white shadow-sm',
      '[&_span]:text-white [&_svg]:text-white',
    ].join(' ');
  }
  return [
    'sidebar-nav-link',
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold',
    'text-[#45474c] hover:bg-[#eff4ff] hover:text-[#091426]',
    '[&_svg]:text-[#6b7a8c] hover:[&_svg]:text-[#091426]',
    '[&_span]:text-[#45474c] hover:[&_span]:text-[#091426]',
  ].join(' ');
}

export default function Sidebar({ user, open, onClose, collapsed, onToggleCollapse }) {
  const navItems = NAV_BY_ROLE[user?.role] || [];
  const homePath = ROLE_DASHBOARD[user?.role] || '/';

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[#091426]/30 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`app-sidebar fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-black/5 bg-white transition-all duration-300 lg:static lg:z-auto lg:translate-x-0 ${
          open ? 'translate-x-0 shadow-xl shadow-[#091426]/10' : '-translate-x-full lg:translate-x-0 lg:shadow-none'
        } ${collapsed ? 'w-[4.5rem]' : 'w-72'}`}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-black/5 px-4">
          <Link to={homePath} onClick={onClose} className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#091426] text-[11px] font-bold text-white">
              SB
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="font-display truncate text-sm font-bold text-[#091426]">SchoolBridge</div>
                <div className="truncate text-[11px] text-[#6b7a8c]">{SCHOOL.name}</div>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#6b7a8c] hover:bg-[#f8f9ff] hover:text-[#091426] lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {!collapsed && (
          <p className="px-5 pb-1 pt-4 text-[10px] font-bold uppercase tracking-widest text-[#6b7a8c]/80">
            Main Menu
          </p>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={sidebarLinkClass}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0 transition-colors duration-200" />
              {!collapsed && (
                <span className="truncate transition-colors duration-200">{label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User card */}
        {!collapsed && user && (
          <div className="shrink-0 border-t border-black/5 p-4">
            <div className="rounded-xl bg-gradient-to-br from-[#f8f9ff] to-[#eff4ff] p-3 ring-1 ring-black/5">
              <div className="truncate text-sm font-semibold text-[#091426]">{user.name}</div>
              <div className="mt-0.5 text-xs text-[#6b7a8c]">{ROLE_LABELS[user.role]}</div>
              <div className="mt-2 text-[10px] font-medium text-[#6b7a8c]/80">{SCHOOL.academicYear}</div>
            </div>
          </div>
        )}

        {/* Collapse */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="mx-3 mb-4 hidden h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-black/5 text-xs font-medium text-[#6b7a8c] transition-all hover:bg-[#f8f9ff] hover:text-[#091426] lg:flex"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft size={16} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && 'Collapse'}
        </button>
      </aside>
    </>
  );
}
