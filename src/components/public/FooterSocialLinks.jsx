import { MessageCircle } from 'lucide-react';
import { getActiveSocialLinks } from '../../data/defaultFooterConfig.js';

function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="currentColor"
        d="M13.5 21v-8h2.6l.4-3h-3V8.1c0-.9.3-1.4 1.5-1.4H16.6V4.1C16.3 4.1 15.3 4 14.2 4 11.9 4 10.3 5.4 10.3 8v2H7.6v3h2.7v8h3.2z"
      />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.6" stroke="currentColor" strokeWidth="2" />
      <circle cx="17" cy="7" r="1.2" fill="currentColor" />
    </svg>
  );
}

function IconTwitter() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="currentColor"
        d="M17.5 4h3.1l-6.8 7.8L21.5 20h-6.1l-4.8-6.2L4.8 20H1.7l7.3-8.3L2.5 4h6.2l4.3 5.6L17.5 4zm-1.1 14.2h1.7L7.9 5.7H6.1l10.3 12.5z"
      />
    </svg>
  );
}

function IconYoutube() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="currentColor"
        d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18 5 12 5 12 5s-6 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 9 2 12 2 12s0 3 .4 4.8a2.5 2.5 0 0 0 1.8 1.8C6 19 12 19 12 19s6 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.8.4-4.8.4-4.8s0-3-.4-4.8zM10 15.5V8.5l5.5 3.5L10 15.5z"
      />
    </svg>
  );
}

function IconLinkedin() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="currentColor"
        d="M6.5 9.5H3.8V20h2.7V9.5zM5.15 4a1.55 1.55 0 1 0 0 3.1 1.55 1.55 0 0 0 0-3.1zM20 20h-2.7v-5.1c0-1.2-.02-2.7-1.65-2.7-1.65 0-1.9 1.3-1.9 2.6V20h-2.7V9.5h2.6v1.2h.04c.36-.68 1.24-1.4 2.55-1.4 2.73 0 3.23 1.8 3.23 4.1V20z"
      />
    </svg>
  );
}

const ICONS = {
  facebook: IconFacebook,
  instagram: IconInstagram,
  twitter: IconTwitter,
  youtube: IconYoutube,
  whatsapp: () => <MessageCircle size={18} aria-hidden />,
  linkedin: IconLinkedin,
};

export default function FooterSocialLinks({ socialLinks, className = '' }) {
  const links = getActiveSocialLinks(socialLinks);
  if (!links.length) return null;

  return (
    <div className={`sb-footer-social ${className}`.trim()} aria-label="Social media">
      {links.map(({ key, label, url }) => {
        const Icon = ICONS[key];
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="sb-footer-social__link"
            aria-label={label}
            title={label}
          >
            {Icon ? <Icon /> : null}
          </a>
        );
      })}
    </div>
  );
}
