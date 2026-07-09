import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import defaultLogo from '../../assets/kids_activities_logo.png';
import footerDefaultLogo from '../../assets/kids_activities_logo_white.png';
import { sanitizeBrandingValue } from '../../utils/brandingUrlUtils.js';

const SIZES = {
  icon: {
    box: 'h-9 w-9 text-[11px] rounded-xl',
    img: 'h-7 w-7 max-h-7 max-w-7 object-contain',
  },
  sm: {
    box: 'h-10 w-10 text-[10px] rounded-lg',
    img: 'h-14 w-auto max-h-14 max-w-[14rem] object-contain',
  },
  md: {
    box: 'h-12 w-12 text-[11px] rounded-xl',
    img: 'h-24 w-auto max-h-24 max-w-[500px] object-contain',
  },
  header: {
    box: 'h-8 md:h-10 w-8 md:w-10 text-[10px] md:text-[11px] rounded-xl',
    img: 'h-8 max-h-8 max-w-[120px] sm:h-10 sm:max-h-10 sm:max-w-[160px] md:h-12 md:max-h-12 md:max-w-[200px] lg:h-14 lg:max-h-14 lg:max-w-[250px] w-auto object-contain',
  },
  lg: {
    box: 'h-16 w-16 text-sm rounded-xl',
    img: 'h-32 w-auto max-h-32 max-w-[600px] object-contain',
  },
  auth: {
    box: 'h-14 w-14 text-[11px] rounded-xl',
    img: 'h-14 w-auto max-h-14 object-contain object-left',
  },
};

function LogoMark({ portalName, sizeClass, imageUrl, className, compact, sidebar }) {
  if (imageUrl) {
    const img = (
      <img
        src={imageUrl}
        alt={`${portalName} logo`}
        className={[
          'block shrink-0',
          compact ? 'portal-logo-compact-img' : sizeClass.img,
          sidebar && !compact ? 'portal-logo-sidebar-img' : '',
          className,
        ].filter(Boolean).join(' ')}
        loading="lazy"
        decoding="async"
      />
    );

    if (sidebar) {
      return (
        <span className={compact ? 'portal-logo-sidebar-mark' : 'portal-logo-sidebar-wrap'}>
          {img}
        </span>
      );
    }

    return img;
  }

  const initials = portalName.slice(0, 2).toUpperCase();

  if (compact) {
    const name = portalName.trim();
    const shortLabel = name.length <= 4
      ? name.toUpperCase()
      : name.split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase() || initials;

    return (
      <span className={sidebar ? 'portal-logo-sidebar-mark' : undefined}>
        <div
          className={['portal-logo-name--compact', className].filter(Boolean).join(' ')}
          title={portalName}
          aria-label={portalName}
        >
          {shortLabel}
        </div>
      </span>
    );
  }

  const fallback = (
    <div
      className={`${sizeClass.box} flex shrink-0 items-center justify-center font-bold text-white border border-white/10 ${className}`}
      style={{ background: 'var(--sb-primary)' }}
    >
      {initials}
    </div>
  );

  if (sidebar) {
    return <span className="portal-logo-sidebar-wrap">{fallback}</span>;
  }

  return fallback;
}

export default function PortalLogo({
  size = 'md',
  className = '',
  compact = false,
  inverse = false,
  markOnly = false,
  sidebar = false,
}) {
  const { portalName, branding } = usePortalConfig();
  const sizeClass = compact ? SIZES.icon : (SIZES[size] || SIZES.md);
  const baseLogo = inverse ? footerDefaultLogo : defaultLogo;
  const logoUrl = sanitizeBrandingValue(branding?.logoUrl);
  const logoIconUrl = sanitizeBrandingValue(branding?.logoIconUrl);
  const imageUrl = markOnly
    ? (logoIconUrl || baseLogo)
    : compact
      ? (logoIconUrl || logoUrl || null)
      : sidebar
        ? (logoUrl || logoIconUrl || baseLogo)
        : (logoIconUrl || logoUrl || baseLogo);

  return (
    <LogoMark
      portalName={portalName}
      sizeClass={sizeClass}
      imageUrl={imageUrl}
      className={className}
      compact={compact}
      sidebar={sidebar}
    />
  );
}

export function FooterPortalLogo({ size = 'lg', className = '' }) {
  const { portalName, branding } = usePortalConfig();
  const sizeClass = SIZES[size] || SIZES.lg;
  const imageUrl = sanitizeBrandingValue(branding?.logoIconUrl)
    || sanitizeBrandingValue(branding?.logoUrl)
    || footerDefaultLogo;

  return (
    <LogoMark
      portalName={portalName}
      sizeClass={sizeClass}
      imageUrl={imageUrl}
      className={className}
      compact={false}
    />
  );
}
