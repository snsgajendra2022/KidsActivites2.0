import { Search, Menu, LogOut, Calendar, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SCHOOL } from '../../data/mockSchool.js';
import { ROLE_LABELS, ROLE_DASHBOARD } from '../../constants/roles.js';
import NotificationBell from '../notifications/NotificationBell.jsx';

export default function Header({ user, onMenuClick, onLogout }) {
  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  const homePath = ROLE_DASHBOARD[user?.role] || '/';

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-black/5 bg-white/90 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 md:h-[4.5rem] md:gap-5 md:px-6 lg:px-8">
        {/* Mobile menu */}
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/5 bg-white text-[#45474c] transition-premium hover:bg-[#f8f9ff] hover:text-[#091426] lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Brand — visible on mobile when sidebar hidden */}
        <Link
          to={homePath}
          className="font-display shrink-0 text-lg font-bold tracking-tighter text-[#091426] lg:hidden"
        >
          SchoolBridge
        </Link>

        {/* Search */}
        <div className="relative hidden min-w-0 flex-1 md:block md:max-w-lg">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#45474c]/60"
          />
          <input
            type="search"
            placeholder="Search applications, students, fees…"
            aria-label="Search"
            className="input-premium w-full rounded-xl border border-black/5 bg-[#f8f9ff]/80 py-2.5 pl-11 pr-4 text-sm text-[#0b1c30] placeholder:text-[#c5c6cd]"
          />
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-1.5 rounded-full border border-black/5 bg-[#f8f9ff] px-3 py-1.5 text-xs font-semibold text-[#45474c] lg:flex">
            <Calendar size={14} className="text-[#45474c]/70" />
            {SCHOOL.academicYear}
          </div>

          <NotificationBell />

          {/* User chip */}
          <div
            className="hidden items-center gap-2.5 rounded-xl border border-black/5 bg-[#f8f9ff]/80 py-1.5 pl-1.5 pr-3 sm:flex"
            title={`${user?.name} · ${ROLE_LABELS[user?.role]}`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#091426] text-[11px] font-bold text-white">
              {initials}
            </div>
            <div className="hidden min-w-0 md:block">
              <p className="truncate text-xs font-semibold text-[#091426]">{user?.name}</p>
              <p className="truncate text-[10px] text-[#45474c]">{ROLE_LABELS[user?.role]}</p>
            </div>
            <ChevronDown size={14} className="hidden text-[#45474c]/50 md:block" />
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="btn-hover-lift inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-2 text-sm font-semibold text-[#091426] sm:px-4"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
