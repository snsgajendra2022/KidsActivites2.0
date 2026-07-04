export default function PageHeader({ title, subtitle, actions, eyebrow, className = '' }) {
  return (
    <div className={`sb-page-header flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div>
        {eyebrow && <p className="sb-eyebrow !mb-1">{eyebrow}</p>}
        <h1 className="sb-page-title">{title}</h1>
        {subtitle && <p className="sb-page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
