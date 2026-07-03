import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProgressiveImageSrc } from '../../hooks/useProgressiveImageSrc.js';
import '../../styles/photo-lightbox.css';
import '../../styles/progressive-image.css';

export default function PhotoLightbox({
  photo,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}) {
  const studioImage = photo?.studioImage || (photo?.variants ? photo : null);
  const { src: progressiveSrc, loading, qualityLabel } = useProgressiveImageSrc(
    studioImage,
    { enabled: !!studioImage },
  );
  const imgSrc = studioImage
    ? progressiveSrc
    : (photo?.previewUrl || photo?.imageUrl);

  useEffect(() => {
    if (!photo) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [photo, onClose, onPrev, onNext, hasPrev, hasNext]);

  if (!photo) return null;

  return (
    <div
      className="photo-lightbox"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
    >
      <button
        type="button"
        className="photo-lightbox__close"
        onClick={onClose}
        aria-label="Close preview"
      >
        <X size={22} />
      </button>

      {hasPrev && (
        <button
          type="button"
          className="photo-lightbox__nav photo-lightbox__nav--prev"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          aria-label="Previous photo"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      <div className="photo-lightbox__content" onClick={(e) => e.stopPropagation()}>
        <div className="photo-lightbox__image-wrap">
          <img
            src={imgSrc}
            alt={photo.caption || 'Classroom photo'}
            className={`photo-lightbox__image progressive-image ${loading ? 'is-upgrading' : 'is-ready'}`}
          />
          {studioImage && loading && qualityLabel ? (
            <span className="photo-lightbox__quality">{qualityLabel}</span>
          ) : null}
        </div>
        <div className="photo-lightbox__info">
          {photo.caption ? (
            <p className="photo-lightbox__caption">{photo.caption}</p>
          ) : null}
          <p className="photo-lightbox__meta">
            {[photo.teacherName, photo.className].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {hasNext && (
        <button
          type="button"
          className="photo-lightbox__nav photo-lightbox__nav--next"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          aria-label="Next photo"
        >
          <ChevronRight size={28} />
        </button>
      )}
    </div>
  );
}
