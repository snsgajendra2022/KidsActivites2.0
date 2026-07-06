import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import defaultLogo from '../../assets/schoolbridge_logo.png';

const SIZES = {
  sm: {
    box: 'h-8 w-8 text-[10px] rounded-lg',
    img: 'h-8 w-auto max-h-8 max-w-[6.5rem] object-contain',
  },
  md: {
    box: 'h-9 w-9 text-[11px] rounded-xl',
    img: 'h-9 w-auto max-h-9 max-w-[8rem] object-contain',
  },
  lg: {
    box: 'h-12 w-12 text-sm rounded-xl',
    img: 'h-12 w-auto max-h-12 max-w-[10rem] object-contain',
  },
};

export default function PortalLogo({ size = 'md', className = '' }) {
  const { portalName, branding } = usePortalConfig();
  const initials = portalName.slice(0, 2).toUpperCase();
  const sizeClass = SIZES[size] || SIZES.md;
  const imageUrl = branding?.logoIconUrl || branding?.logoUrl || defaultLogo;

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={`${portalName} logo`}
        className={`block shrink-0 ${sizeClass.img} ${className}`}
        width={size === 'lg' ? 48 : size === 'sm' ? 32 : 36}
        height={size === 'lg' ? 48 : size === 'sm' ? 32 : 36}
        loading="lazy"
        decoding="async"
      />
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
