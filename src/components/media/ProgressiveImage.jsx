import { useProgressiveImageSrc } from '../../hooks/useProgressiveImageSrc.js';
import '../../styles/progressive-image.css';

export default function ProgressiveImage({
  image,
  mode = 'thumbnail',
  alt = '',
  className = '',
  enabled = true,
  ...imgProps
}) {
  const { src, loading } = useProgressiveImageSrc(image, { mode, enabled });

  if (!src) {
    return <div className={`progressive-image progressive-image--placeholder ${className}`} aria-hidden />;
  }

  return (
    <img
      {...imgProps}
      src={src}
      alt={alt}
      className={`progressive-image ${loading ? 'is-upgrading' : 'is-ready'} ${className}`.trim()}
      loading="lazy"
      decoding="async"
    />
  );
}
