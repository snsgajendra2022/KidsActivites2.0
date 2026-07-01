import { Link, NavLink } from 'react-router-dom';
import { ChevronLeft, X } from 'lucide-react';
import { NAV_BY_ROLE } from '../../constants/navigation.js';
import { ROLE_LABELS, ROLE_DASHBOARD } from '../../constants/roles.js';
import { SCHOOL } from '../../data/mockSchool.js';

function navLinkClass({ isActive }) {
  return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-premium ${
    isActive
      ? 'bg-[#091426] text-white shadow-sm'
      : 'text-[#45474c] hover:bg-[#f8f9ff] hover:text-[#091426]'
  }`;
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
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-black/5 bg-white shadow-xl shadow-[#091426]/5 transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 lg:shadow-none ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-20 lg:w-20' : 'w-72'}`}
      >
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-4">
          <Link to={homePath} onClick={onClose} className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#091426] text-xs font-bold text-white">
              SB
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="font-display truncate text-sm font-bold text-[#091426]">SchoolBridge</div>
                <div className="truncate text-xs text-[#45474c]">{SCHOOL.name}</div>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#45474c] hover:bg-[#f8f9ff] lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {!collapsed && (
          <p className="px-5 pt-4 text-[10px] font-bold uppercase tracking-widest text-[#45474c]/60">
            Main Menu
          </p>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={navLinkClass}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {!collapsed && user && (
          <div className="border-t border-black/5 p-4">
            <div className="rounded-xl bg-[#f8f9ff] p-3 ring-1 ring-black/5">
              <div className="truncate text-sm font-semibold text-[#091426]">{user.name}</div>
              <div className="mt-0.5 text-xs text-[#45474c]">{ROLE_LABELS[user.role]}</div>
              <div className="mt-2 text-[10px] font-medium text-[#45474c]/70">{SCHOOL.academicYear}</div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          className="mx-3 mb-4 hidden items-center justify-center gap-2 rounded-xl border border-black/5 py-2 text-xs font-medium text-[#45474c] transition-premium hover:bg-[#f8f9ff] lg:flex"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft size={16} className={collapsed ? 'rotate-180' : ''} />
          {!collapsed && 'Collapse'}
        </button>
      </aside>
    </>
  );
}
