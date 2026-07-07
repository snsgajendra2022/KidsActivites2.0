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

  return (
    <div className={`sb-page sb-editorial-page sb-editorial-auth flex min-h-dvh flex-col ${className}`.trim()}>
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
            <div className="auth-split__card-header">
              <div className="auth-split__card-brand">
                <PortalLogo size="sm" className="auth-split__card-logo-full" />
              </div>
              <div className="auth-split__card-brand-divider" aria-hidden="true" />
              <div className="auth-split__card-heading">
                <h2 className="auth-split__card-title">{title}</h2>
                {subtitle && <p className="auth-split__subtitle">{subtitle}</p>}
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
