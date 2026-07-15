import { Link } from 'react-router-dom';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { useSchoolEnrollPath } from '../../hooks/useSchoolBasePath.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { FooterPortalLogo } from '../brand/PortalLogo.jsx';
import TenantFooterContent from '../public/TenantFooterContent.jsx';
import { buildDefaultCopyright } from '../../data/defaultFooterConfig.js';

export const FOOTER_LINKS = [
  { label: 'Terms & Conditions', to: '/terms-and-conditions' },
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Security Policy', to: '/security-policy' },
  { label: 'Terms of Use', to: '/terms-of-use' },
  { label: 'System Status', to: '/system-status' },
  { label: 'Direct Support', to: '/support' },
];

export default function PublicFooter({ compact = false, minimal = false }) {
  const { portalName, footerText, tagline, school, footer } = usePortalConfig();
  const { isPlatformHome, isTenantRoute } = useTenant();
  const { loginPath, tenantPath } = useTenantPath();
  const defaultEnrollPath = useSchoolEnrollPath();
  const enrollPath = isTenantRoute
    ? tenantPath('/enrollment/kidzee-print-form')
    : defaultEnrollPath;
  const admissionsCtaPath = isPlatformHome ? '/workspace/new' : loginPath;
  const admissionsCtaLabel = isPlatformHome ? 'Enrollment' : 'Login';

  const schoolName = school?.name || portalName;
  const copyright = footer?.copyright?.trim()
    || footerText?.trim()
    || buildDefaultCopyright(schoolName);
  const description = footer?.description?.trim() || tagline || 'Activity enrollment and parent communication platform';
  const linkPrefix = isPlatformHome ? (path) => path : tenantPath;

  if (minimal) {
    return (
      <footer className="public-footer login-portal-footer-minimal relative z-10 shrink-0 px-3 py-2">
        <p className="mx-auto max-w-screen-2xl truncate text-center text-[10px] text-on-primary-faint">
          {copyright}
        </p>
        {isPlatformHome && (
          <nav className="public-footer-links mt-1.5 md:mt-2" aria-label="Footer">
            {FOOTER_LINKS.map(({ label, to }) => (
              <Link key={to} to={linkPrefix(to)} className="public-footer-link text-on-primary-faint hover:text-on-primary-muted">
                {label}
              </Link>
            ))}
          </nav>
        )}
      </footer>
    );
  }

  if (!isPlatformHome) {
    return (
      <footer className="public-footer sb-tenant-footer relative z-10 shrink-0">
        <div className="sb-container sb-tenant-footer__inner">
          <TenantFooterContent
            compact={compact}
            enrollPath={enrollPath}
            admissionsCtaPath={admissionsCtaPath}
            admissionsCtaLabel={admissionsCtaLabel}
            tenantPath={tenantPath}
            showSchoolName={false}
          />
        </div>
      </footer>
    );
  }

  return (
    <footer className="public-footer relative z-10 shrink-0 px-4 py-3 md:px-10 md:py-4">
      <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-3 md:flex-row md:gap-4">
        <div className="flex flex-col items-center md:items-start">
          <div className="flex flex-col items-center justify-center gap-2 md:flex-row md:justify-start">
            <FooterPortalLogo size="sm" />
            <span className="text-center font-display text-base font-semibold tracking-tighter text-on-primary md:text-left md:text-lg">
              {portalName}
            </span>
          </div>
          <p className="mt-2 text-center text-sm font-medium text-on-primary/80 md:mt-1 md:text-left">
            {description}
          </p>
          <p className="mt-1 text-center text-[11px] text-on-primary-subtle md:text-left">
            {copyright}
            {!compact && ' Professional Grade Enrollment.'}
          </p>
        </div>
        <nav className="public-footer-links" aria-label="Footer">
          {FOOTER_LINKS.map(({ label, to }) => (
            <Link key={to} to={linkPrefix(to)} className="public-footer-link">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
