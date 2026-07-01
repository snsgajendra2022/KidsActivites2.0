import { Search, Menu, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SCHOOL } from '../../data/mockSchool.js';
import { ROLE_DASHBOARD } from '../../constants/roles.js';
import NotificationBell from '../notifications/NotificationBell.jsx';
import UserMenu from './UserMenu.jsx';

export default function Header({ user, onMenuClick, onLogout }) {
  const homePath = ROLE_DASHBOARD[user?.role] || '/';

  return (
    <header className="app-header shrink-0 border-b border-black/5 bg-white/95 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 md:gap-4 md:px-6 lg:px-8">
        {/* Mobile menu */}
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/5 bg-white text-[#45474c] transition-all duration-200 hover:border-black/10 hover:bg-[#f8f9ff] hover:text-[#091426] lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Mobile brand */}
        <Link
          to={homePath}
          className="font-display shrink-0 text-lg font-bold tracking-tighter text-[#091426] lg:hidden"
        >
          SchoolBridge
        </Link>

        {/* Search */}
        <div className="relative hidden min-w-0 flex-1 md:block md:max-w-xl">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7a8c]"
          />
          <input
            type="search"
            placeholder="Search applications, students, fees…"
            aria-label="Search"
            className="h-10 w-full rounded-xl border border-black/5 bg-[#f8f9ff] pl-11 pr-4 text-sm text-[#0b1c30] outline-none transition-all placeholder:text-[#9aa3b2] focus:border-[#0058be]/40 focus:bg-white focus:ring-2 focus:ring-[#0058be]/10"
          />
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-1.5 rounded-full border border-black/5 bg-[#f8f9ff] px-3 py-1.5 text-xs font-semibold text-[#45474c] lg:flex">
            <Calendar size={14} className="text-[#6b7a8c]" />
            {SCHOOL.academicYear}
          </div>

          <NotificationBell />
          <UserMenu user={user} onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
}
