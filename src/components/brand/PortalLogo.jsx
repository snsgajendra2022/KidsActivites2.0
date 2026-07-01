import { usePortalConfig } from '../../context/PortalConfigContext.jsx';

const SIZES = {
  sm: { box: 'h-8 w-8 text-[10px] rounded-lg', img: 'h-8 w-8 rounded-lg' },
  md: { box: 'h-9 w-9 text-[11px] rounded-xl', img: 'h-9 w-9 rounded-xl' },
  lg: { box: 'h-12 w-12 text-sm rounded-xl', img: 'h-12 w-12 rounded-xl' },
};

export default function PortalLogo({ size = 'md', className = '' }) {
  const { portalName, branding } = usePortalConfig();
  const initials = portalName.slice(0, 2).toUpperCase();
  const sizeClass = SIZES[size] || SIZES.md;
  const imageUrl = branding?.logoIconUrl || branding?.logoUrl;

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={`${portalName} logo`}
        className={`${sizeClass.img} shrink-0 object-cover ${className}`}
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
