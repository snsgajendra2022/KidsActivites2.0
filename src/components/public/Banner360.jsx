import { lazy, Suspense } from 'react';
import '@photo-sphere-viewer/core/index.css';
import '../../styles/banner-360.css';

const PhotoSphereViewer = lazy(() =>
  import('react-photo-sphere-viewer').then((mod) => ({
    default: mod.ReactPhotoSphereViewer,
  })),
);

function Banner360Fallback({ imageUrl, title, subtitle }) {
  return (
    <div className="banner-360-fallback">
      <img src={imageUrl} alt="" className="banner-360-fallback__image" loading="lazy" />
      {(title || subtitle) && (
        <div className="banner-360-overlay">
          {title && <h2 className="banner-360-overlay__title">{title}</h2>}
          {subtitle && <p className="banner-360-overlay__subtitle">{subtitle}</p>}
        </div>
      )}
    </div>
  );
}

export default function Banner360({ imageUrl, height, title, subtitle }) {
  const sectionHeight = height || 'min(70vh, 32rem)';

  return (
    <section
      className="banner-360"
      style={{ '--banner-360-height': sectionHeight }}
      aria-label={title || '360 campus panorama'}
    >
      <Suspense fallback={<Banner360Fallback imageUrl={imageUrl} title={title} subtitle={subtitle} />}>
        <PhotoSphereViewer
          src={imageUrl}
          height="100%"
          width="100%"
          littlePlanet={false}
          defaultZoomLvl={0}
          navbar={['zoom', 'caption', 'fullscreen']}
          containerClass="banner-360-viewer"
        />
      </Suspense>
      {(title || subtitle) && (
        <div className="banner-360-overlay banner-360-overlay--interactive">
          {title && <h2 className="banner-360-overlay__title">{title}</h2>}
          {subtitle && <p className="banner-360-overlay__subtitle">{subtitle}</p>}
        </div>
      )}
    </section>
  );
}
