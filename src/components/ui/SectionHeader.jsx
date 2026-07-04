export default function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className = '',
}) {
  const alignClass = align === 'left' ? 'text-left' : 'text-center';

  return (
    <div className={`mb-12 ${alignClass} ${className}`}>
      {eyebrow && <p className="sb-eyebrow">{eyebrow}</p>}
      {title && (
        <h2 className="font-display mb-3 text-3xl font-bold tracking-tight text-brand">{title}</h2>
      )}
      {subtitle && <p className={`text-muted ${align === 'center' ? 'mx-auto max-w-2xl' : ''}`}>{subtitle}</p>}
    </div>
  );
}
