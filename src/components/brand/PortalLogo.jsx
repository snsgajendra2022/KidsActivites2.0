import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import defaultLogo from '../../assets/schoolbridge_logo.png';
import footerDefaultLogo from '../../assets/FooterdefaultLogo.png';

const SIZES = {
  sm: {
    box: 'h-8 w-8 text-[10px] rounded-lg',
    img: 'h-12 w-auto max-h-12 max-w-[12rem] object-contain scale-110 origin-left',
  },
  md: {
    box: 'h-10 w-10 text-[11px] rounded-xl',
    img: 'h-20 w-auto max-h-20 max-w-[400px] object-contain scale-110 origin-left',
  },
  lg: {
    box: 'h-12 w-12 text-sm rounded-xl',
    img: 'h-28 w-auto max-h-28 max-w-[480px] object-contain scale-110 origin-left',
  },
};

function LogoMark({ portalName, sizeClass, imageUrl, className }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={`${portalName} logo`}
        className={`block shrink-0 ${sizeClass.img} ${className}`}
        loading="lazy"
        decoding="async"
      />
    );
  }

  const initials = portalName.slice(0, 2).toUpperCase();

  return (
    <div
      className={`${sizeClass.box} flex shrink-0 items-center justify-center font-bold text-white border border-white/10 ${className}`}
      style={{ background: 'var(--sb-primary)' }}
    >
      {initials}
    </div>
  );
}

export default function PortalLogo({ size = 'md', className = '' }) {
  const { portalName, branding } = usePortalConfig();
  const sizeClass = SIZES[size] || SIZES.md;
  const imageUrl = branding?.logoIconUrl || branding?.logoUrl || defaultLogo;

  return (
    <LogoMark
      portalName={portalName}
      sizeClass={sizeClass}
      imageUrl={imageUrl}
      className={className}
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
    />
  );
}
