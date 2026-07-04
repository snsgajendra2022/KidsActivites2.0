import { Link } from 'react-router-dom';
import PublicHeader from './PublicHeader.jsx';
import PublicFooter from './PublicFooter.jsx';
import PortalLogo from '../brand/PortalLogo.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';

export default function AuthSplitLayout({
  title,
  subtitle,
  visualTitle,
  visualSubtitle,
  visualBadge,
  visualContent,
  workspaceSlug,
  children,
  footerLink,
  className = '',
}) {
  const { portalName, school } = usePortalConfig();
  const workspaceHost = typeof window !== 'undefined' ? window.location.host : null;

  return (
    <div className={`sb-page flex min-h-dvh flex-col ${className}`.trim()}>
      <PublicHeader compact />
      <div className="auth-split flex-1">
        <div className="auth-split__visual">
          <div className="auth-split__visual-content">
            <p className="sb-eyebrow !text-[var(--sb-gold)]">{visualBadge || 'Secure Portal'}</p>
            <h1>{visualTitle || `Welcome to ${portalName}`}</h1>
            <p className="mt-4">
              {visualSubtitle || `Sign in to manage admissions, fees, and communication for ${school?.name || 'your school'}.`}
            </p>
            {visualContent}
          </div>
        </div>
        <div className="auth-split__form-side">
          <div className="auth-split__card">
            <div className="mb-5 flex items-center gap-3">
              <PortalLogo size="md" />
              <div className="min-w-0">
                <h2>{title}</h2>
                {subtitle && <p className="auth-split__subtitle !mb-0 truncate">{subtitle}</p>}
                {(workspaceHost || workspaceSlug) && (
                  <p className="auth-split__workspace mt-1 truncate font-mono text-[11px] text-muted">
                    {workspaceHost || `${workspaceSlug}.schoolbridge.com`}
                  </p>
                )}
              </div>
            </div>
            {children}
            {footerLink && (
              <p className="mt-6 text-center text-sm text-muted">
                <Link to={footerLink.to} className="font-semibold text-accent hover:underline">
                  {footerLink.label}
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
      <PublicFooter compact />
    </div>
  );
}
