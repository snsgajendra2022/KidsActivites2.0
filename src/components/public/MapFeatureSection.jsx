import { MapPin } from 'lucide-react';

const DEFAULT_MAP = '/assets/schoolbridge-map-placeholder.svg';

export default function MapFeatureSection({
  title = 'Find Us',
  subtitle,
  address,
  imageUrl,
  className = '',
}) {
  return (
    <section className={`sb-map-section ${className}`.trim()}>
      <div className="sb-container sb-map-section__inner">
        <div>
          <h2 className="sb-editorial-heading">{title}</h2>
          {subtitle && <p className="sb-editorial-subheading">{subtitle}</p>}
          {address && (
            <p className="mt-6 flex items-start gap-2 text-sm leading-relaxed" style={{ color: 'var(--sb-ink)' }}>
              <MapPin size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--sb-purple)' }} />
              {address}
            </p>
          )}
        </div>
        <div className="sb-map-section__visual">
          <img src={imageUrl || DEFAULT_MAP} alt="" loading="lazy" />
          <span className="sb-map-section__pin" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
