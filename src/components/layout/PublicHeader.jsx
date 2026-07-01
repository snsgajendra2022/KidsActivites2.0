import { Link, useLocation } from 'react-router-dom';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import PortalLogo from '../brand/PortalLogo.jsx';
import LoginHeaderScrollText from '../auth/LoginHeaderScrollText.jsx';

const NAV_LINKS = [
  { to: '/enroll', label: 'Admissions' },
  { to: '/#programs', label: 'Programs', hash: true },
  { to: '/#about', label: 'About', hash: true },
  { to: '/#contact', label: 'Contact', hash: true },
];

export default function PublicHeader({ glass = false, compact = false, loginMobile = false }) {
  const location = useLocation();
  const { portalName, config } = usePortalConfig();
  const loginScrollLines = config?.loginScrollLines;

  return (
    <header
      className={`relative z-50 shrink-0 border-b backdrop-blur-md transition-premium ${
        glass
          ? 'border-white/20 bg-white/80'
          : 'border-black/5 bg-white/90'
      } ${loginMobile ? 'login-public-header' : ''}`}
    >
      <nav
        className={`mx-auto flex w-full max-w-screen-2xl items-center gap-2 sm:gap-3 ${
          loginMobile ? 'justify-start' : 'justify-between'
        } ${
          loginMobile
            ? 'h-12 px-3'
            : compact
              ? 'h-14 px-4'
              : 'h-16 px-4 md:h-[4.5rem] md:px-10'
        }`}
      >
        <div className="flex min-w-0 shrink-0 items-center gap-4 md:gap-8">
          <Link to="/" className="flex min-w-0 items-center gap-2 md:gap-3">
            <PortalLogo size={loginMobile ? 'sm' : 'md'} />
            <span className={`login-header-brand-text font-display truncate font-bold tracking-tighter text-brand ${
              loginMobile ? 'text-base' : 'text-xl md:text-2xl'
            }`}>
              {portalName}
            </span>
          </Link>
          {!loginMobile && (
            <div className="hidden items-center gap-6 md:flex">
              {NAV_LINKS.map(({ to, label, hash }) => (
                <Link
                  key={label}
                  to={to}
                  className={`text-sm font-semibold transition-premium ${
                    !hash && location.pathname === to
                      ? 'text-brand'
                      : 'text-muted hover:text-brand'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {loginMobile && loginScrollLines?.length > 0 && (
          <div className="login-header-marquee-inner min-w-0 flex-1">
            <LoginHeaderScrollText lines={loginScrollLines} />
          </div>
        )}

        {!loginMobile && (
        <div className="flex shrink-0 items-center gap-2 md:gap-4">
          {location.pathname !== '/login' && !loginMobile && (
            <Link
              to="/login"
              className="hidden text-sm font-semibold text-brand/60 transition-premium hover:text-brand md:block px-3 py-2"
            >
              Staff Portal
            </Link>
          )}
          {location.pathname !== '/login' && (
            <Link
              to="/login"
              className={`sb-link-btn sb-link-btn--dark btn-hover-lift sb-btn-pill bg-brand text-sm font-semibold transition-premium hover:opacity-90 ${
                loginMobile ? 'px-3 py-2 text-xs' : ''
              }`}
            >
              Login
            </Link>
          )}
        </div>
        )}
      </nav>
    </header>
  );
}
