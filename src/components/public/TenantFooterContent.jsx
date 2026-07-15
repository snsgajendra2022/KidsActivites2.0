import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { FooterPortalLogo } from '../brand/PortalLogo.jsx';
import FooterSocialLinks from './FooterSocialLinks.jsx';
import { buildDefaultCopyright } from '../../data/defaultFooterConfig.js';

function resolveQuickLinkPath(url, tenantPath) {
  const trimmed = (url || '').trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed;
  return tenantPath(trimmed.startsWith('/') ? trimmed : `/${trimmed}`);
}

function QuickLinkItem({ link, tenantPath }) {
  const trimmed = (link.url || '').trim();
  const isExternal = /^https?:\/\//i.test(trimmed);
  const to = isExternal ? trimmed : resolveQuickLinkPath(trimmed, tenantPath);

  if (isExternal) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer">
        {link.label}
      </a>
    );
  }

  return <Link to={to}>{link.label}</Link>;
}

function ContactList({ school, compact }) {
  const items = [
    school?.address ? { icon: MapPin, type: 'text', value: school.address } : null,
    school?.phone ? { icon: Phone, type: 'phone', value: school.phone } : null,
    school?.email ? { icon: Mail, type: 'email', value: school.email } : null,
  ].filter(Boolean);

  if (!items.length || compact) return null;

  return (
    <ul className="sb-tenant-footer__contact">
      {items.map(({ icon: Icon, type, value }) => (
        <li key={value} className="sb-tenant-footer__contact-item">
          <span className="sb-tenant-footer__contact-icon" aria-hidden>
            <Icon size={15} strokeWidth={2} />
          </span>
          {type === 'phone' ? (
            <a href={`tel:${value.replace(/\s/g, '')}`}>{value}</a>
          ) : type === 'email' ? (
            <a href={`mailto:${value}`}>{value}</a>
          ) : (
            <span>{value}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function TenantFooterContent({
  compact = false,
  enrollPath,
  admissionsCtaPath,
  admissionsCtaLabel,
  tenantPath,
  showSchoolName = true,
}) {
  const { portalName, school, footer, tagline } = usePortalConfig();

  const schoolName = school?.name || portalName;
  const copyright = footer?.copyright?.trim() || buildDefaultCopyright(schoolName);
  const description = footer?.description?.trim() || tagline;
  const quickLinks = (footer?.quickLinks || []).filter(
    (link) => link?.label?.trim() && link?.url?.trim(),
  );

  return (
    <>
      <div className="sb-tenant-footer__grid">
        <div className="sb-tenant-footer__brand">
          <div className="sb-tenant-footer__brand-header">
            <FooterPortalLogo size="sm" />
            {showSchoolName && (
              <p className="sb-tenant-footer__school-name">{schoolName}</p>
            )}
          </div>
          {description && (
            <p className="sb-tenant-footer__desc">{description}</p>
          )}
          <ContactList school={school} compact={compact} />
          <FooterSocialLinks
            socialLinks={footer?.socialLinks}
            className="sb-tenant-footer__social"
          />
        </div>

        <div className="sb-tenant-footer__col">
          <p className="sb-tenant-footer__heading">Admissions</p>
          <ul className="sb-tenant-footer__links">
            <li><Link to={enrollPath}>Start Enrollment</Link></li>
            <li><Link to={admissionsCtaPath}>{admissionsCtaLabel}</Link></li>
          </ul>
        </div>

        {quickLinks.length > 0 && (
          <div className="sb-tenant-footer__col">
            <p className="sb-tenant-footer__heading">Quick Links</p>
            <ul className="sb-tenant-footer__links">
              {quickLinks.map((link) => (
                <li key={`${link.label}-${link.url}`}>
                  <QuickLinkItem link={link} tenantPath={tenantPath} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="sb-tenant-footer__bottom">
        {copyright}
      </div>
    </>
  );
}
