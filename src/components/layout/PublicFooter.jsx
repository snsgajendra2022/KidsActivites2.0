import { usePortalConfig } from '../../context/PortalConfigContext.jsx';

const FOOTER_LINKS = [
  { label: 'Security Policy', href: '#' },
  { label: 'Terms of Use', href: '#' },
  { label: 'System Status', href: '#' },
  { label: 'Direct Support', href: '#' },
];

export default function PublicFooter({ compact = false, minimal = false }) {
  const { portalName, footerText } = usePortalConfig();

  if (minimal) {
    return (
      <footer className="public-footer login-portal-footer-minimal relative z-10 shrink-0 px-3 py-2">
        <p className="mx-auto max-w-screen-2xl truncate text-center text-[10px] text-on-primary-faint">
          {footerText}
        </p>
      </footer>
    );
  }

  return (
    <footer className="public-footer relative z-10 shrink-0 px-4 py-3 md:px-10 md:py-4">
      <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-3 md:flex-row md:gap-4">
        <div className="flex flex-col items-center md:items-start">
          <span className="font-display text-base font-semibold tracking-tighter text-on-primary md:text-lg">
            {portalName}
          </span>
          <p className="text-center text-[11px] text-on-primary-subtle md:text-left">
            {footerText}
            {!compact && ' Professional Grade Enrollment.'}
          </p>
        </div>
        <div className="hidden flex-wrap justify-center gap-5 md:flex md:gap-8">
          {FOOTER_LINKS.map(({ label, href }) => (
            <a key={label} className="public-footer-link" href={href}>
              {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
