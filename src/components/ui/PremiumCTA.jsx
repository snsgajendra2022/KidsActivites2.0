import { Link } from 'react-router-dom';

export default function PremiumCTA({
  eyebrow,
  title,
  subtitle,
  action,
  icon: Icon,
  variant = 'navy',
  className = '',
}) {
  const isNavy = variant === 'navy';

  return (
    <section className={`${isNavy ? 'sb-cta-band sb-section--navy' : 'sb-section sb-section--cream'} ${className}`}>
      <div className="sb-container text-center">
        {Icon && (
          <Icon size={40} className={`mx-auto mb-4 ${isNavy ? 'text-on-primary-subtle' : 'text-accent'}`} />
        )}
        {eyebrow && <p className="sb-eyebrow">{eyebrow}</p>}
        <h2 className={`sb-cta-band__title ${!isNavy ? '!text-brand' : ''}`}>{title}</h2>
        {subtitle && (
          <p className={`mb-8 max-w-xl mx-auto ${isNavy ? 'text-on-primary-muted' : 'text-muted'}`}>
            {subtitle}
          </p>
        )}
        {action?.to && (
          <Link
            to={action.to}
            className={action.className || (isNavy ? 'sb-button-gold sb-btn-pill btn-hover-lift inline-flex items-center gap-2' : 'sb-button-primary sb-btn-pill btn-hover-lift inline-flex items-center gap-2')}
          >
            {action.label}
          </Link>
        )}
      </div>
    </section>
  );
}
