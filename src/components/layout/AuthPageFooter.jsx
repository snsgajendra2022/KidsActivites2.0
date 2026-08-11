import { Link } from 'react-router-dom';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { buildDefaultCopyright } from '../../data/defaultFooterConfig.js';
import { FooterPortalLogo } from '../brand/PortalLogo.jsx';

const AUTH_FOOTER_LINKS = [
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Terms of Use', to: '/terms-of-use' },
  { label: 'Support', to: '/support' },
];

/**
 * Slim auth-page footer — readable colors, no Admissions / enrollment clutter.
 */
export default function AuthPageFooter() {
  const { portalName, school, footer } = usePortalConfig();
  const { tenantPath, loginPath } = useTenantPath();
  const schoolName = school?.name || portalName || 'Kids Activities';
  const copyright = footer?.copyright?.trim() || buildDefaultCopyright(schoolName);

  return (
    <footer className="auth-page-footer" role="contentinfo">
      <div className="auth-page-footer__inner">
        <div className="auth-page-footer__brand">
          <FooterPortalLogo size="sm" className="auth-page-footer__logo" />
          <div className="auth-page-footer__copy">
            <p className="auth-page-footer__school">{schoolName}</p>
            <p className="auth-page-footer__legal">{copyright}</p>
          </div>
        </div>

        <nav className="auth-page-footer__nav" aria-label="Footer">
          {AUTH_FOOTER_LINKS.map(({ label, to }) => (
            <Link key={to} to={to} className="auth-page-footer__link">
              {label}
            </Link>
          ))}
          <Link to={loginPath} className="auth-page-footer__link auth-page-footer__link--accent">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
