import { Link } from 'react-router-dom';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { useSchoolEnrollPath } from '../../hooks/useSchoolBasePath.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';

export default function EditorialFooter({ compact = false }) {
  const { portalName, school, platform } = usePortalConfig();
  const { isPlatformHome } = useTenant();
  const { loginPath } = useTenantPath();
  const enrollPath = useSchoolEnrollPath();

  const tagline = isPlatformHome
    ? (platform?.tagline || 'Multi-school enrollment platform')
    : school?.address;

  const contactLine = isPlatformHome
    ? 'Contact your school directly for admissions assistance.'
    : [school?.phone, school?.email].filter(Boolean).join(' · ');

  return (
    <footer className="sb-editorial-footer">
      <div className="sb-container">
        <div className="sb-editorial-footer__grid">
          <div>
            <p className="sb-editorial-footer__brand">{isPlatformHome ? portalName : school?.name || portalName}</p>
            <p className="sb-editorial-footer__tagline">{tagline}</p>
            {!compact && contactLine && (
              <p className="sb-editorial-footer__tagline mt-4">{contactLine}</p>
            )}
          </div>

          <div>
            <p className="sb-editorial-footer__heading">Admissions</p>
            <ul className="sb-editorial-footer__links">
              <li><Link to={enrollPath}>Start Enrollment</Link></li>
              <li><Link to={loginPath}>Parent Login</Link></li>
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
      </div>
    </footer>
  );
}
