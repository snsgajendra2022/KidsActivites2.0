import { Link } from 'react-router-dom';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { FooterPortalLogo } from '../brand/PortalLogo.jsx';

export const FOOTER_LINKS = [
  { label: 'Terms & Conditions', to: '/terms-and-conditions' },
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Security Policy', to: '/security-policy' },
  { label: 'Terms of Use', to: '/terms-of-use' },
  { label: 'System Status', to: '/system-status' },
  { label: 'Direct Support', to: '/support' },
];

export default function PublicFooter({ compact = false, minimal = false }) {
  const { portalName, footerText, tagline } = usePortalConfig();

  if (minimal) {
    return (
      <footer className="public-footer login-portal-footer-minimal relative z-10 shrink-0 px-3 py-2">
        <p className="mx-auto max-w-screen-2xl truncate text-center text-[10px] text-on-primary-faint">
          {footerText}
        </p>
        <nav className="public-footer-links mt-1.5 md:mt-2" aria-label="Footer">
          {FOOTER_LINKS.map(({ label, to }) => (
            <Link key={to} to={to} className="public-footer-link text-on-primary-faint hover:text-on-primary-muted">
              {label}
            </Link>
          ))}
        </nav>
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
            {tagline || 'Activity enrollment and parent communication platform'}
          </p>
          <p className="mt-1 text-center text-[11px] text-on-primary-subtle md:text-left">
            {footerText}
            {!compact && ' Professional Grade Enrollment.'}
          </p>
        </div>
        <nav className="public-footer-links" aria-label="Footer">
          {FOOTER_LINKS.map(({ label, to }) => (
            <Link key={to} to={to} className="public-footer-link">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
