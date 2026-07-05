import { Link } from 'react-router-dom';

const DEFAULT_BG = '/assets/schoolbridge-cta-placeholder.svg';

export default function FinalImageCTA({
  title,
  subtitle,
  action,
  imageUrl,
  className = '',
}) {
  return (
    <section className={`sb-final-cta sb-editorial-section ${className}`.trim()}>
      <div className="sb-container">
        <div className="sb-final-cta__frame">
          <div className="sb-final-cta__bg" aria-hidden="true">
            <img src={imageUrl || DEFAULT_BG} alt="" />
          </div>
          <div className="sb-final-cta__content">
            {title && <h2 className="sb-editorial-heading sb-editorial-heading--light">{title}</h2>}
            {subtitle && (
              <p className="sb-editorial-subheading" style={{ color: 'rgba(255,255,255,0.75)', margin: '0 auto 1.5rem' }}>
                {subtitle}
              </p>
            )}
            {action?.to && (
              <Link to={action.to} className={action.className || 'sb-purple-cta sb-purple-cta--gold'}>
                {action.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
