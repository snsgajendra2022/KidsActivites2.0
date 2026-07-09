import '../../styles/banner-360.css';

/** Static campus image banner — no 360° canvas viewer. */
export default function StaticCampusBanner({ imageUrl, title, subtitle }) {
  if (!imageUrl) return null;

  return (
    <section className="banner-360 banner-360--static" aria-label={title || 'Campus image'}>
      <div className="banner-360-fallback banner-360-fallback--static">
        <img src={imageUrl} alt="" className="banner-360-fallback__image" loading="lazy" />
        {(title || subtitle) && (
          <div className="banner-360-overlay">
            {title && <h2 className="banner-360-overlay__title">{title}</h2>}
            {subtitle && <p className="banner-360-overlay__subtitle">{subtitle}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
