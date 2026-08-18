import { Calendar, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import GlobalSearchLauncher from '../global-search/GlobalSearchLauncher.jsx';
import NotificationBell from '../notifications/NotificationBell.jsx';
import UserMenu from './UserMenu.jsx';

export default function Header({ user, onMenuClick, onLogout }) {
  const { portalName, school } = usePortalConfig();
  const { roleDashboard } = useTenantPath();
  const homePath = roleDashboard(user?.role) || '/';

  return (
    <header className="app-header shrink-0 border-b border-black/5 bg-white/95 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 md:gap-4 md:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-black/5 bg-white text-muted transition-all duration-200 hover:border-black/10 hover:bg-brand-muted hover:text-brand lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <Link
          to={homePath}
          className="font-display shrink-0 text-lg font-bold tracking-tighter text-brand lg:hidden"
        >
          {portalName}
        </Link>

        <div className="min-w-0 flex-1 lg:max-w-xl">
          <GlobalSearchLauncher />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-1.5 rounded-full border border-black/5 sb-surface px-3 py-1.5 text-xs font-semibold text-muted lg:flex">
            <Calendar size={14} className="text-[var(--sb-gold)]" />
            {school?.academicYear}
          </div>

          <NotificationBell />
          <UserMenu user={user} onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
}
