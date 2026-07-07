import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
<<<<<<< HEAD
import defaultLogo from '../../assets/kids_activities_logo.png';
import footerDefaultLogo from '../../assets/kids_activities_logo_white.png';
=======
import defaultLogo from '../../assets/kidsactivites_logo.png';
import footerDefaultLogo from '../../assets/FooterdefaultLogo.png';
>>>>>>> 0e6e0343f6eae898026f88eb7524d1d7016e697b

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

export default function PortalLogo({ size = 'md', className = '', compact = false, inverse = false }) {
  const { portalName, branding } = usePortalConfig();
  const sizeClass = compact ? SIZES.icon : (SIZES[size] || SIZES.md);
  const baseLogo = inverse ? footerDefaultLogo : defaultLogo;
  const imageUrl = compact
    ? (branding?.logoIconUrl || branding?.logoUrl || null)
    : (branding?.logoIconUrl || branding?.logoUrl || baseLogo);

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
