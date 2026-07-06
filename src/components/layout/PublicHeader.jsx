import { Link, useLocation } from 'react-router-dom';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { useSchoolBasePath, useSchoolEnrollPath } from '../../hooks/useSchoolBasePath.js';
import PortalLogo from '../brand/PortalLogo.jsx';
import LoginHeaderScrollText from '../auth/LoginHeaderScrollText.jsx';

export default function PublicHeader({ glass = false, compact = false, loginMobile = false }) {
  const location = useLocation();
  const { portalName, config } = usePortalConfig();
  const { isTenantRoute } = useTenant();
  const { loginPath } = useTenantPath();
  const basePath = useSchoolBasePath() || '/';
  const enrollPath = useSchoolEnrollPath();
  const loginScrollLines = config?.loginScrollLines;

  const navLinks = [
    { to: enrollPath, label: 'Admissions' },
  ];

  const onLoginPage = isTenantRoute
    ? location.pathname.endsWith('/login')
    : location.pathname === '/login';

  return (
    <header
      className={`relative z-50 shrink-0 border-b backdrop-blur-md transition-premium ${
        glass
          ? 'border-white/20 bg-white/80'
          : 'border-[var(--sb-border)] bg-[var(--sb-ivory)]/95'
      } ${loginMobile ? 'login-public-header' : ''}`}
    >
      <div className={`mx-auto w-full max-w-screen-2xl ${loginMobile ? 'login-header-inner' : ''}`}>
        <nav
          className={`flex w-full items-center gap-2 sm:gap-3 ${
            loginMobile ? 'login-header-nav--login justify-start' : 'justify-between'
          } ${
            loginMobile
              ? 'h-16 px-3 md:h-20'
              : compact
                ? 'h-20 px-4'
                : 'h-24 px-4 md:h-32 md:px-10'
          }`}
        >
          <div className="flex min-w-0 shrink-0 items-center gap-4 md:gap-8">
            <Link to={basePath} className="flex min-w-0 items-center gap-2 md:gap-3">
              <PortalLogo size={loginMobile ? 'sm' : 'header'} />
            </Link>
          </div>

          {loginMobile && loginScrollLines?.length > 0 && (
            <div className="login-header-marquee-inner login-header-marquee-inner--desktop hidden min-w-0 flex-1 md:flex">
              <LoginHeaderScrollText lines={loginScrollLines} variant="horizontal" />
            </div>
          )}

          {!loginMobile && (
            <div className="flex shrink-0 items-center gap-3 md:gap-6">
              {navLinks.map(({ to, label, hash }) => (
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
              
              <Link
                to={loginPath}
                className="sb-purple-cta"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
              >
                Login
              </Link>
            </div>
          )}
        </nav>

        {loginMobile && loginScrollLines?.length > 0 && (
          <div className="login-header-marquee-row md:hidden">
            <LoginHeaderScrollText lines={loginScrollLines} variant="vertical" />
          </div>
        )}
      </div>
    </header>
  );
}
