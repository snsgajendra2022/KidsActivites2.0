import { Link, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { useUnreadMessageCount } from '../../hooks/useUnreadMessageCount.js';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { buildCollapsedNavGroups } from '../../utils/navUtils.js';
import PortalLogo from '../brand/PortalLogo.jsx';

/** Survives AppLayout remounts when each page wraps its own shell. */
let persistedSidebarNavScrollTop = 0;

const FLYOUT_VIEWPORT_MARGIN = 12;
const FLYOUT_MIN_HEIGHT = 120;

function isChatNavItem(item) {
  const id = item?.id || '';
  const to = item?.to || '';
  return id.includes('messages') || id.includes('chat') || /\/messages$|\/chat$/.test(to);
}

function formatUnreadBadge(count) {
  if (count > 99) return '99+';
  return String(count);
}

function pathMatches(pathname, to) {
  if (!to) return false;
  const cleanTo = String(to).replace(/\/+$/, '') || '/';
  const cleanPath = String(pathname).replace(/\/+$/, '') || '/';
  if (cleanPath === cleanTo) return true;
  return cleanPath.startsWith(`${cleanTo}/`);
}

function sidebarLinkClass({ isActive, collapsed }) {
  const base = 'sidebar-nav-link flex items-center gap-3 text-sm font-semibold';
  if (collapsed) {
    return [
      base,
      'sidebar-nav-link--rail',
      isActive ? 'sidebar-nav-link-active' : '',
    ].filter(Boolean).join(' ');
  }
  if (isActive) {
    return [
      'sidebar-nav-link sidebar-nav-link-active',
      base,
      'rounded-xl px-3 py-2.5',
    ].join(' ');
  }
  return [
    'sidebar-nav-link',
    base,
    'rounded-xl px-3 py-2.5',
  ].join(' ');
}

function flyoutLinkClass({ isActive }) {
  return [
    'sidebar-flyout-link',
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold',
    isActive ? 'sidebar-nav-link-active' : 'sidebar-nav-link',
  ].join(' ');
}

export default function Sidebar({ user, open, onClose, collapsed, onToggleCollapse }) {
  const { portalName, school, getNavItems } = usePortalConfig();
  const { roleDashboard } = useTenantPath();
  const location = useLocation();
  const navItems = getNavItems(user?.role);
  const homePath = roleDashboard(user?.role) || '/';
  const unreadMessageCount = useUnreadMessageCount();
  const navRef = useRef(null);
  const flyoutRef = useRef(null);
  const flyoutAnchorTopRef = useRef(0);
  const [openSection, setOpenSection] = useState(null);
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, maxHeight: undefined });

  const collapsedGroups = useMemo(
    () => (collapsed ? buildCollapsedNavGroups(navItems) : []),
    [collapsed, navItems],
  );

  const activeFlyoutGroup = useMemo(
    () => collapsedGroups.find(
      (group) => group.type === 'group' && group.section === openSection,
    ),
    [collapsedGroups, openSection],
  );

  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return undefined;
    el.scrollTop = persistedSidebarNavScrollTop;
    const onScroll = () => {
      persistedSidebarNavScrollTop = el.scrollTop;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      persistedSidebarNavScrollTop = el.scrollTop;
      el.removeEventListener('scroll', onScroll);
    };
  }, []);

  useLayoutEffect(() => {
    if (!openSection || !collapsed || !activeFlyoutGroup) return undefined;

    const updateFlyoutPosition = () => {
      const el = flyoutRef.current;
      if (!el) return;

      const margin = FLYOUT_VIEWPORT_MARGIN;
      const viewportH = window.innerHeight;
      const maxAvailable = Math.max(FLYOUT_MIN_HEIGHT, viewportH - margin * 2);

      // Cap height so we can measure the clamped panel, then shift up if needed.
      el.style.maxHeight = `${maxAvailable}px`;
      const height = el.getBoundingClientRect().height;

      let top = flyoutAnchorTopRef.current;
      if (top + height > viewportH - margin) {
        top = viewportH - margin - height;
      }
      top = Math.max(margin, top);

      const maxHeight = Math.min(maxAvailable, viewportH - margin - top);

      setFlyoutPos((prev) => (
        prev.top === top && prev.maxHeight === maxHeight
          ? prev
          : { top, maxHeight }
      ));
    };

    updateFlyoutPosition();
    window.addEventListener('resize', updateFlyoutPosition);
    return () => window.removeEventListener('resize', updateFlyoutPosition);
  }, [openSection, collapsed, activeFlyoutGroup]);

  useEffect(() => {
    if (!openSection || !collapsed) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpenSection(null);
    };
    const onPointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (flyoutRef.current?.contains(target)) return;
      if (target.closest?.('[data-sidebar-group-trigger="true"]')) return;
      setOpenSection(null);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [openSection, collapsed]);

  const handleToggleCollapse = () => {
    setOpenSection(null);
    onToggleCollapse?.();
  };

  const handleNavClick = () => {
    const el = navRef.current;
    if (el) persistedSidebarNavScrollTop = el.scrollTop;
    setOpenSection(null);

    // Close mobile drawer only; avoid unnecessary desktop state churn.
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      onClose?.();
    }

    // Keep scroll after remount / focus changes from route navigation.
    requestAnimationFrame(() => {
      if (navRef.current) navRef.current.scrollTop = persistedSidebarNavScrollTop;
    });
  };

  const toggleSectionFlyout = (section, triggerEl) => {
    if (openSection === section) {
      setOpenSection(null);
      return;
    }
    if (triggerEl) {
      const preferredTop = Math.max(
        FLYOUT_VIEWPORT_MARGIN,
        triggerEl.getBoundingClientRect().top,
      );
      flyoutAnchorTopRef.current = preferredTop;
      setFlyoutPos({
        top: preferredTop,
        maxHeight: Math.max(FLYOUT_MIN_HEIGHT, window.innerHeight - FLYOUT_VIEWPORT_MARGIN * 2),
      });
    }
    setOpenSection(section);
  };

  const renderExpandedNav = () =>
    navItems.map(({ id, to, label, icon: Icon, section }, index) => {
      const prevSection = navItems[index - 1]?.section;
      const showSection = section && section !== prevSection;
      const showUnreadBadge = isChatNavItem({ id, to }) && unreadMessageCount > 0;

      return (
        <div key={id || to}>
          {showSection && (
            <p className="sidebar-nav-section px-2 pb-1 pt-4 text-[10px] font-bold uppercase tracking-widest text-[#6b7a8c]/80 first:pt-2">
              {section}
            </p>
          )}
          <NavLink
            to={to}
            onClick={handleNavClick}
            className={(props) => sidebarLinkClass({ ...props, collapsed: false })}
          >
            <span className="sidebar-nav-icon-wrap relative shrink-0">
              <Icon size={18} className="transition-colors duration-200" />
            </span>
            <span className="min-w-0 flex-1 truncate transition-colors duration-200">{label}</span>
            {showUnreadBadge && (
              <span className="sidebar-nav-badge" aria-label={`${unreadMessageCount} unread messages`}>
                {formatUnreadBadge(unreadMessageCount)}
              </span>
            )}
          </NavLink>
        </div>
      );
    });

  const renderCollapsedNav = () =>
    collapsedGroups.map((entry) => {
      if (entry.type === 'link') {
        const { to, label, icon: Icon } = entry.item;
        const showUnreadBadge = isChatNavItem(entry.item) && unreadMessageCount > 0;
        return (
          <div key={entry.key}>
            <NavLink
              to={to}
              onClick={handleNavClick}
              className={(props) => sidebarLinkClass({ ...props, collapsed: true })}
              title={label}
            >
              <span className="sidebar-nav-icon-wrap relative shrink-0">
                <Icon size={18} className="transition-colors duration-200" />
                {showUnreadBadge && (
                  <span className="sidebar-nav-badge sidebar-nav-badge--rail" aria-hidden>
                    {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                  </span>
                )}
              </span>
            </NavLink>
          </div>
        );
      }

      const GroupIcon = entry.icon;
      const isOpen = openSection === entry.section;
      const isGroupActive = entry.items.some((item) => pathMatches(location.pathname, item.to));
      const groupUnread = entry.items.some((item) => isChatNavItem(item)) && unreadMessageCount > 0;

      return (
        <div key={entry.key} className="relative">
          <button
            type="button"
            data-sidebar-group-trigger="true"
            title={entry.section}
            aria-label={`${entry.section} menu`}
            aria-expanded={isOpen}
            aria-haspopup="menu"
            className={[
              'sidebar-nav-link sidebar-nav-link--rail sidebar-nav-group-btn',
              isGroupActive || isOpen ? 'sidebar-nav-link-active' : '',
            ].filter(Boolean).join(' ')}
            onClick={(event) => toggleSectionFlyout(entry.section, event.currentTarget)}
          >
            <span className="sidebar-nav-icon-wrap relative shrink-0">
              <GroupIcon size={18} className="transition-colors duration-200" />
              {groupUnread && (
                <span className="sidebar-nav-badge sidebar-nav-badge--rail" aria-hidden>
                  {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                </span>
              )}
            </span>
          </button>
        </div>
      );
    });

  return (
    <>
      <div
        className={`sidebar-mobile-backdrop fixed inset-0 z-[1100] backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`app-sidebar fixed inset-y-0 left-0 z-[1200] flex h-full flex-col border-r border-[var(--sb-border)] transition-all duration-300 lg:static lg:z-auto lg:translate-x-0 ${
          open ? 'translate-x-0 shadow-xl shadow-black/10' : '-translate-x-full lg:translate-x-0 lg:shadow-none'
        } ${collapsed ? 'app-sidebar--collapsed' : 'w-72'}`}
      >
        <div
          className={`sidebar-top relative flex shrink-0 border-b border-[var(--sb-border)] ${
            collapsed ? 'sidebar-top--collapsed' : 'h-16 items-center px-3'
          }`}
        >
          {collapsed ? (
            <div className="sidebar-top-collapsed-stack">
              <Link
                to={homePath}
                onClick={onClose}
                title={portalName}
                className="sidebar-brand-initials-btn sidebar-logo-link--collapsed"
              >
                <PortalLogo size="icon" compact sidebar />
              </Link>
              <button
                type="button"
                onClick={handleToggleCollapse}
                className="sidebar-expand-btn hidden lg:inline-flex"
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <PanelLeftOpen size={17} strokeWidth={2.25} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="sidebar-mobile-close-btn inline-flex lg:hidden"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <>
              <Link
                to={homePath}
                onClick={onClose}
                className="flex min-w-0 flex-1 items-center gap-3 pr-10"
              >
                <PortalLogo size="md" sidebar />
                <div className="min-w-0">
                  <div className="sidebar-brand-title font-display truncate text-sm font-bold">{portalName}</div>
                  <div className="sidebar-brand-subtitle truncate text-[11px]">{school?.name}</div>
                </div>
              </Link>

              <div className="absolute right-[2px] top-1/2 flex -translate-y-1/2 items-center gap-1">
                <button
                  type="button"
                  onClick={handleToggleCollapse}
                  className="sidebar-collapse-btn hidden lg:inline-flex"
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose size={17} strokeWidth={2.25} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="sidebar-mobile-close-btn inline-flex lg:hidden"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>
            </>
          )}
        </div>

        <nav
          ref={navRef}
          className={`sidebar-nav flex-1 overflow-y-auto ${collapsed ? 'sidebar-nav--collapsed' : 'space-y-1 px-3 py-2'}`}
        >
          {collapsed ? renderCollapsedNav() : renderExpandedNav()}
        </nav>
      </aside>

      {collapsed && activeFlyoutGroup ? (
        <div
          ref={flyoutRef}
          className="sidebar-flyout"
          style={{
            top: flyoutPos.top,
            ...(flyoutPos.maxHeight != null ? { maxHeight: flyoutPos.maxHeight } : {}),
          }}
          role="menu"
          aria-label={activeFlyoutGroup.section}
        >
          <div className="sidebar-flyout-header">{activeFlyoutGroup.section}</div>
          <div className="sidebar-flyout-list">
            {activeFlyoutGroup.items.map((item) => {
              const Icon = item.icon;
              const showUnreadBadge = isChatNavItem(item) && unreadMessageCount > 0;
              return (
                <NavLink
                  key={item.id || item.to}
                  to={item.to}
                  role="menuitem"
                  onClick={handleNavClick}
                  className={flyoutLinkClass}
                >
                  <span className="sidebar-nav-icon-wrap relative shrink-0">
                    <Icon size={17} className="transition-colors duration-200" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {showUnreadBadge && (
                    <span className="sidebar-nav-badge" aria-label={`${unreadMessageCount} unread messages`}>
                      {formatUnreadBadge(unreadMessageCount)}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
}
