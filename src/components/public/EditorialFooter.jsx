import { Link } from 'react-router-dom';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { useSchoolEnrollPath } from '../../hooks/useSchoolBasePath.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { FooterPortalLogo } from '../brand/PortalLogo.jsx';
import TenantFooterContent from './TenantFooterContent.jsx';
import { buildDefaultCopyright } from '../../data/defaultFooterConfig.js';
import { FOOTER_LINKS } from '../layout/PublicFooter.jsx';

export default function EditorialFooter({ compact = false }) {
  const { portalName, school, platform, footer, tagline } = usePortalConfig();
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
    || buildDefaultCopyright(schoolName);

  if (isPlatformHome) {
    const platformTagline = platform?.tagline || tagline || 'Multi-school enrollment platform';
    return (
      <footer className="sb-editorial-footer">
        <div className="sb-container">
          <div className="sb-editorial-footer__grid">
            <div className="flex flex-col items-start gap-4">
              <FooterPortalLogo size="sm" />
              <p className="sb-editorial-footer__tagline">{platformTagline}</p>
              {!compact && (
                <p className="sb-editorial-footer__tagline mt-4">
                  Contact your school directly for admissions assistance.
                </p>
              )}
            </div>

            <div>
              <p className="sb-editorial-footer__heading">Admissions</p>
              <ul className="sb-editorial-footer__links">
                <li><Link to={enrollPath}>Start Enrollment</Link></li>
                <li><Link to={admissionsCtaPath}>{admissionsCtaLabel}</Link></li>
              </ul>
            </div>

            <div>
              <p className="sb-editorial-footer__heading">Legal</p>
              <ul className="sb-editorial-footer__links">
                {FOOTER_LINKS.filter(({ to }) => ['/privacy-policy', '/terms-of-use'].includes(to)).map(({ label, to }) => (
                  <li key={to}><Link to={to}>{label}</Link></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="sb-editorial-footer__bottom">
            {platform?.footerText?.trim() || copyright}
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="sb-editorial-footer sb-tenant-footer">
      <div className="sb-container">
        <div className="sb-editorial-footer__grid">
          <div className="flex flex-col items-start gap-4">
            <FooterPortalLogo size="sm" />
            <p className="sb-editorial-footer__tagline">Activity enrollment and parent communication platform.</p>
          </div>

          <div>
            <p className="sb-editorial-footer__heading">Admissions</p>
            <ul className="sb-editorial-footer__links">
              <li><Link to={enrollPath}>Start Enrollment</Link></li>
              <li><Link to={loginPath}>Login</Link></li>
            </ul>
          </div>

          <div>
            <p className="sb-editorial-footer__heading">Features</p>
            <ul className="sb-editorial-footer__links">
              <li><Link to="/">Digital Admissions</Link></li>
              <li><Link to="/">Photo Albums</Link></li>
              <li><Link to="/">Fee Management</Link></li>
              <li><Link to="/">Documents</Link></li>
              <li><Link to="/">Parent Portal</Link></li>
            </ul>
          </div>

          <div>
            <p className="sb-editorial-footer__heading">Contact</p>
            <ul className="sb-editorial-footer__links">
              <li><a href="tel:+12144940908">+1 214-494-0908</a></li>
              <li><a href="mailto:support@kidsactivities.com">support@kidsactivities.com</a></li>
            </ul>
          </div>

          <div>
            <p className="sb-editorial-footer__heading">Legal</p>
            <ul className="sb-editorial-footer__links">
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/terms-of-use">Terms of Use</Link></li>
            </ul>
          </div>
        </div>

        <div className="sb-editorial-footer__bottom">
          © {new Date().getFullYear()} {portalName}. All rights reserved.
        </div>
        <TenantFooterContent
          compact={compact}
          enrollPath={enrollPath}
          admissionsCtaPath={admissionsCtaPath}
          admissionsCtaLabel={admissionsCtaLabel}
          tenantPath={tenantPath}
        />
      </div>
    </footer>
  );
}
