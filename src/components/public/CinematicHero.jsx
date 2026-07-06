import { Link } from 'react-router-dom';
import PortalLogo from '../brand/PortalLogo.jsx';

const DEFAULT_BG = '/assets/schoolbridge-hero-placeholder.svg';

export default function CinematicHero({
  imageUrl,
  badge,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  compact = false,
  className = '',
  children,
}) {
  const bg = imageUrl || DEFAULT_BG;

  return (
    <section className={`sb-cinematic-hero ${compact ? 'sb-cinematic-hero--compact' : ''} ${className}`.trim()}>
      <div className="sb-cinematic-hero__bg" aria-hidden="true">
        <img src={bg} alt="" />
        <div className="sb-cinematic-hero__bg-overlay" />
      </div>

      <div className="sb-hero-frame">
        {/* Logo removed from hero per request */}
        <div className="sb-hero-frame__body">
          {badge && <div className="sb-hero-frame__badge">{badge}</div>}
          <h1 className="sb-hero-title">{title}</h1>
          {subtitle && <p className="sb-hero-frame__subtitle">{subtitle}</p>}
          {(primaryAction || secondaryAction) && (
            <div className="sb-hero-frame__actions">
              {primaryAction?.to && (
                <Link
                  to={primaryAction.to}
                  className={primaryAction.className || 'sb-purple-cta sb-purple-cta--gold'}
                >
                  {primaryAction.label}
                </Link>
              )}
              {primaryAction?.onClick && (
                <button
                  type="button"
                  onClick={primaryAction.onClick}
                  className={primaryAction.className || 'sb-purple-cta sb-purple-cta--gold'}
                >
                  {primaryAction.label}
                </button>
              )}
              {secondaryAction?.to && (
                <Link
                  to={secondaryAction.to}
                  className={secondaryAction.className || 'sb-purple-cta sb-purple-cta--outline'}
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
