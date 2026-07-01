import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import '../../styles/photo-lightbox.css';

export default function PhotoLightbox({
  photo,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}) {
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
        <img
          src={photo.imageUrl}
          alt={photo.caption || 'Classroom photo'}
          className="photo-lightbox__image"
        />
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
