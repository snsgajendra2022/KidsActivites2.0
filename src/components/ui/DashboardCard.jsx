export default function DashboardCard({
  title,
  subtitle,
  actions,
  children,
  className = '',
  warm = false,
}) {
  return (
    <div className={`premium-card ${warm ? 'sb-card-gold-accent' : ''} ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h3 className="font-display text-base font-bold text-brand">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
