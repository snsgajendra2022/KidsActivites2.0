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
