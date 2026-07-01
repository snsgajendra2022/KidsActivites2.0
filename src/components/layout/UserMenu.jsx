import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LogOut, User, Settings } from 'lucide-react';
import { ROLE_LABELS, ROLE_DASHBOARD } from '../../constants/roles.js';
import { isDemoUser } from '../../services/api/demoMode.js';

export default function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  const homePath = ROLE_DASHBOARD[user?.role] || '/';

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-xl border py-1.5 pl-1.5 pr-2.5 transition-all duration-200 sm:pr-3 ${
          open
            ? 'border-[color-mix(in_srgb,var(--sb-secondary)_30%,transparent)] bg-brand-muted ring-2 ring-[color-mix(in_srgb,var(--sb-secondary)_15%,transparent)]'
            : 'border-black/5 bg-[var(--sb-surface)]/80 hover:border-black/10 hover:bg-brand-muted'
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-[11px] font-bold text-white">
          {initials}
        </div>
        <div className="hidden min-w-0 text-left md:block">
          <p className="max-w-[120px] truncate text-xs font-semibold text-brand">{user?.name}</p>
          <p className="max-w-[120px] truncate text-[10px] text-muted">{ROLE_LABELS[user?.role]}</p>
        </div>
        <ChevronDown
          size={14}
          className={`hidden shrink-0 text-muted transition-transform duration-200 md:block ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-[60] w-64 overflow-hidden rounded-xl border border-black/5 bg-white shadow-xl"
          style={{ boxShadow: '0 8px 24px color-mix(in srgb, var(--sb-primary) 12%, transparent)' }}
          role="menu"
        >
          <div className="border-b border-black/5 sb-surface px-4 py-3">
            <p className="truncate text-sm font-semibold text-brand">{user?.name}</p>
            <p className="truncate text-xs text-muted">{user?.email || user?.identity}</p>
            <span className="mt-2 inline-flex rounded-full bg-brand-muted px-2.5 py-0.5 text-[10px] font-semibold text-accent">
              {ROLE_LABELS[user?.role]}
            </span>
            {isDemoUser(user) && (
              <span className="user-menu-demo-badge mt-2">Demo account</span>
            )}
          </div>

          <div className="p-1.5">
            <Link
              to={homePath}
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-brand-muted hover:text-brand"
              role="menuitem"
            >
              <User size={16} className="text-[#6b7a8c]" />
              My Dashboard
            </Link>
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-brand-muted hover:text-brand"
              role="menuitem"
            >
              <Settings size={16} className="text-[#6b7a8c]" />
              Account Settings
            </Link>
          </div>

          <div className="border-t border-black/5 p-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
              role="menuitem"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
