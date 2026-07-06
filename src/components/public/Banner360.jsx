import { ReactPhotoSphereViewer } from 'react-photo-sphere-viewer';
import '@photo-sphere-viewer/core/index.css';

export default function Banner360({ imageUrl, height = '70vh', title, subtitle }) {
  return (
    <section className="relative w-full overflow-hidden bg-brand" style={{ height }}>
      <ReactPhotoSphereViewer
        src={imageUrl}
        height="100%"
        width="100%"
        littlePlanet={false}
        defaultZoomLvl={0}
        navbar={['zoom', 'caption', 'fullscreen']}
      />
      {(title || subtitle) && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/20 p-4 text-center">
          {title && <h2 className="font-display mb-4 text-4xl font-extrabold text-white drop-shadow-lg md:text-6xl">{title}</h2>}
          {subtitle && <p className="text-lg font-medium text-white/90 drop-shadow-md md:text-xl">{subtitle}</p>}
        </div>
      )}
    </section>
  );
}
