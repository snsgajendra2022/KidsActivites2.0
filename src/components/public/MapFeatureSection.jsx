import { MapPin } from 'lucide-react';
import { resolveMapEmbedUrl } from '../../utils/mapEmbed.js';

const DEFAULT_MAP = '/assets/kidsactivites-map-placeholder.svg';

export default function MapFeatureSection({
  title = 'Find Us',
  subtitle,
  address,
  embedUrl,
  imageUrl,
  className = '',
}) {
  const mapSrc = resolveMapEmbedUrl(embedUrl, address);
  const useIframe = Boolean(mapSrc);

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
        <div className={`sb-map-section__visual${useIframe ? ' sb-map-section__visual--embed' : ''}`}>
          {useIframe ? (
            <iframe
              title={title || 'Campus location map'}
              src={mapSrc}
              className="sb-map-section__iframe"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          ) : (
            <>
              <img src={imageUrl || DEFAULT_MAP} alt="" loading="lazy" />
              <span className="sb-map-section__pin" aria-hidden="true" />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
