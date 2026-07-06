import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import defaultLogo from '../../assets/schoolbridge_logo.png';
import footerDefaultLogo from '../../assets/FooterdefaultLogo.png';

const SIZES = {
  icon: {
    box: 'h-9 w-9 text-[11px] rounded-xl',
    img: 'h-7 w-7 max-h-7 max-w-7 object-contain',
  },
  sm: {
    box: 'h-8 w-8 text-[10px] rounded-lg',
    img: 'h-8 w-auto max-h-8 max-w-[6.5rem] object-contain object-left',
  },
  md: {
    box: 'h-10 w-10 text-[11px] rounded-xl',
    img: 'h-9 w-auto max-h-9 max-w-[8.5rem] object-contain object-left',
  },
  lg: {
    box: 'h-12 w-12 text-sm rounded-xl',
    img: 'h-12 w-auto max-h-12 max-w-[10rem] object-contain object-left',
  },
};

function LogoMark({ portalName, sizeClass, imageUrl, className, compact }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={`${portalName} logo`}
        className={[
          'block shrink-0',
          compact ? 'portal-logo-compact-img' : sizeClass.img,
          className,
        ].filter(Boolean).join(' ')}
        loading="lazy"
        decoding="async"
      />
    );
  }

  const initials = portalName.slice(0, 2).toUpperCase();

  if (compact) {
    const name = portalName.trim();
    const shortLabel = name.length <= 4
      ? name.toUpperCase()
      : name.split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase() || initials;

    return (
      <div
        className={['portal-logo-name--compact', className].filter(Boolean).join(' ')}
        title={portalName}
        aria-label={portalName}
      >
        {shortLabel}
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass.box} flex shrink-0 items-center justify-center font-bold text-white border border-white/10 ${className}`}
      style={{ background: 'var(--sb-primary)' }}
    >
      {initials}
    </div>
  );
}

export default function PortalLogo({ size = 'md', className = '', compact = false }) {
  const { portalName, branding } = usePortalConfig();
  const sizeClass = compact ? SIZES.icon : (SIZES[size] || SIZES.md);
  const imageUrl = compact
    ? (branding?.logoIconUrl || branding?.logoUrl || null)
    : (branding?.logoIconUrl || branding?.logoUrl || defaultLogo);

  return (
    <LogoMark
      portalName={portalName}
      sizeClass={sizeClass}
      imageUrl={imageUrl}
      className={className}
      compact={compact}
    />
  );
}

export function FooterPortalLogo({ size = 'lg', className = '' }) {
  const { portalName, branding } = usePortalConfig();
  const sizeClass = SIZES[size] || SIZES.lg;
  const imageUrl = branding?.logoIconUrl || branding?.logoUrl || footerDefaultLogo;

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
