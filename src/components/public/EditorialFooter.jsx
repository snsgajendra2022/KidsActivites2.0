import { Link } from 'react-router-dom';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { useSchoolEnrollPath } from '../../hooks/useSchoolBasePath.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import PortalLogo from '../brand/PortalLogo.jsx';

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
          <div className="flex flex-col items-start gap-4">
            <PortalLogo size="lg" />
            <p className="sb-editorial-footer__tagline">{tagline}</p>
            {!compact && contactLine && (
              <p className="sb-editorial-footer__tagline mt-4">{contactLine}</p>
            )}
          </div>

          <div>
            <p className="sb-editorial-footer__heading">Admissions</p>
            <ul className="sb-editorial-footer__links">
              <li><Link to={enrollPath}>Start Enrollment</Link></li>
              <li><Link to={loginPath}>Login</Link></li>
            </ul>
          </div>

          <div>
            <p className="sb-editorial-footer__heading">Contact</p>
            <ul className="sb-editorial-footer__links">
              <li><a href="tel:+12144940908">+1 214-494-0908</a></li>
              <li><a href="mailto:sandeep.gupta@snssystem.com">sandeep.gupta@snssystem.com</a></li>
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
