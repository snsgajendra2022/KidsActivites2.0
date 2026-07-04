import { Link } from 'react-router-dom';

export default function PublicHero({
  eyebrow,
  title,
  subtitle,
  imageUrl,
  primaryAction,
  secondaryAction,
  badge,
  className = '',
  children,
}) {
  return (
    <section className={`sb-hero ${className}`}>
      <div className="absolute inset-0 z-0">
        {imageUrl && <img alt="" className="h-full w-full object-cover" src={imageUrl} />}
        <div className="sb-hero__overlay" />
      </div>
      <div className="sb-container sb-hero__content px-4 py-16 md:px-10 md:py-20">
        <div className="max-w-2xl">
          {(badge || eyebrow) && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
              {badge || <span className="sb-eyebrow !mb-0 !text-[0.65rem] !text-white/90">{eyebrow}</span>}
            </div>
          )}
          <h1 className="font-display mb-5 text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/80">{subtitle}</p>
          )}
          {(primaryAction || secondaryAction) && (
            <div className="flex flex-wrap gap-4">
              {primaryAction?.to ? (
                <Link to={primaryAction.to} className={primaryAction.className || 'sb-button-gold sb-btn-pill btn-hover-lift'}>
                  {primaryAction.label}
                </Link>
              ) : primaryAction?.onClick ? (
                <button type="button" onClick={primaryAction.onClick} className={primaryAction.className || 'sb-button-gold sb-btn-pill btn-hover-lift'}>
                  {primaryAction.label}
                </button>
              ) : null}
              {secondaryAction?.to && (
                <Link
                  to={secondaryAction.to}
                  className={secondaryAction.className || 'sb-link-btn sb-link-btn--dark sb-btn-pill btn-hover-lift inline-flex items-center gap-2 border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white'}
                >
                  {secondaryAction.label}
                </Link>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}
