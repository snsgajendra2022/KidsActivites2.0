import { Link, NavLink } from 'react-router-dom';
import { ChevronLeft, X } from 'lucide-react';
import { ROLE_LABELS } from '../../constants/roles.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import PortalLogo from '../brand/PortalLogo.jsx';

function sidebarLinkClass({ isActive }) {
  if (isActive) {
    return [
      'sidebar-nav-link sidebar-nav-link-active',
      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold',
    ].join(' ');
  }
  return [
    'sidebar-nav-link',
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold',
  ].join(' ');
}

export default function Sidebar({ user, open, onClose, collapsed, onToggleCollapse }) {
  const { portalName, school, getNavItems } = usePortalConfig();
  const { roleDashboard } = useTenantPath();
  const navItems = getNavItems(user?.role);
  const homePath = roleDashboard(user?.role) || '/';

  return (
    <>
      <div
        className={`sidebar-mobile-backdrop fixed inset-0 z-40 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`app-sidebar fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-[color-mix(in_srgb,var(--sb-gold)_15%,transparent)] transition-all duration-300 lg:static lg:z-auto lg:translate-x-0 ${
          open ? 'translate-x-0 shadow-xl shadow-black/20' : '-translate-x-full lg:translate-x-0 lg:shadow-none'
        } ${collapsed ? 'w-[4.5rem]' : 'w-72'}`}
      >
        <div className="sidebar-top relative flex h-16 shrink-0 items-center border-b border-[color-mix(in_srgb,var(--sb-gold)_12%,transparent)] px-3">
          <Link
            to={homePath}
            onClick={onClose}
            className={`flex min-w-0 items-center gap-3 ${collapsed ? 'w-full justify-center pr-7' : 'min-w-0 flex-1 pr-10'}`}
          >
            <span className="sidebar-logo-wrap shrink-0">
              <PortalLogo size="md" />
            </span>
            {!collapsed && (
              <div className="min-w-0">
                <div className="sidebar-brand-title font-display truncate text-sm font-bold">{portalName}</div>
                <div className="sidebar-brand-subtitle truncate text-[11px]">{school?.name}</div>
              </div>
            )}
          </Link>

          <div className="absolute right-[2px] top-1/2 flex -translate-y-1/2 items-center gap-1">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="sidebar-collapse-btn hidden lg:inline-flex"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronLeft size={18} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#6b7a8c] hover:bg-brand-muted hover:text-brand lg:hidden"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {navItems.map(({ id, to, label, icon: Icon, section }, index) => {
            const prevSection = navItems[index - 1]?.section;
            const showSection = !collapsed && section && section !== prevSection;

            return (
              <div key={id || to}>
                {showSection && (
                  <p className="sidebar-nav-section px-2 pb-1 pt-4 text-[10px] font-bold uppercase tracking-widest text-[#6b7a8c]/80 first:pt-2">
                    {section}
                  </p>
                )}
                <NavLink
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
              </div>
            );
          })}
        </nav>

        {!collapsed && user && (
          <div className="shrink-0 border-t border-[color-mix(in_srgb,var(--sb-gold)_12%,transparent)] p-4">
            <div className="sidebar-user-card rounded-xl p-3 ring-1">
              <div className="sidebar-user-name truncate text-sm font-semibold">{user.name}</div>
              <div className="sidebar-user-role mt-0.5 text-xs">{ROLE_LABELS[user.role]}</div>
              <div className="sidebar-user-meta mt-2 text-[10px] font-medium">{school?.academicYear}</div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
