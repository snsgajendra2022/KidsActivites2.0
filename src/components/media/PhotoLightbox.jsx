import { useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { useProgressiveImageSrc } from '../../hooks/useProgressiveImageSrc.js';
import {
  firstNonThumbnailUrl,
  isVideoPlaybackReady,
} from '../../utils/photoStudioProgressive.js';
import { normalizeVideoMediaItem, resolveLayoutRendition } from '../../utils/videoMediaNormalize.js';
import { getProgressiveVideoSources } from '../../utils/videoSourceResolver.js';
import { preloadNextMedia } from '../../utils/preloadMedia.js';
import WebVideoPlayer from './WebVideoPlayer.jsx';
import '../../styles/photo-lightbox.css';
import '../../styles/progressive-image.css';

export default function PhotoLightbox({
  photo,
  photos,
  currentIndex,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  positionLabel,
}) {
  const normalizedVideo = useMemo(
    () => (photo?.mediaType === 'VIDEO' ? normalizeVideoMediaItem(photo) : null),
    [photo],
  );

  const playable = useMemo(
    () => (photo?.mediaType === 'VIDEO' ? getProgressiveVideoSources(photo) : null),
    [photo],
  );

  const studioImage = photo?.studioImage || (photo?.variants ? photo : null);
  const isVideo = photo?.mediaType === 'VIDEO' && Boolean(playable?.sources?.length);
  const videoReady = isVideo && isVideoPlaybackReady(photo);
  const { src: progressiveSrc, loading, qualityLabel } = useProgressiveImageSrc(
    studioImage,
    { enabled: !!studioImage && !isVideo },
  );
  const imgSrc = studioImage
    ? progressiveSrc
    : firstNonThumbnailUrl(photo?.previewUrl, photo?.downloadUrl, photo?.imageUrl);

  const videoRenditions = useMemo(
    () => normalizedVideo?.renditions ?? (Array.isArray(photo?.renditions) ? photo.renditions : []),
    [normalizedVideo, photo],
  );

  const maxQuality = normalizedVideo?.maxQuality;
  const posterUrl = playable?.posterUrl
    || photo?.thumbnailUrl
    || photo?.previewUrl
    || undefined;

  const layoutRendition = useMemo(
    () => (isVideo ? resolveLayoutRendition(videoRenditions, photo) : null),
    [isVideo, videoRenditions, photo],
  );

  const videoLayoutStyle = useMemo(() => {
    if (!layoutRendition?.width || !layoutRendition?.height) return undefined;
    return {
      '--video-aspect-ratio': `${layoutRendition.width} / ${layoutRendition.height}`,
      '--video-ar-w': layoutRendition.width,
      '--video-ar-h': layoutRendition.height,
    };
  }, [layoutRendition]);

  const isPortraitVideo = Boolean(
    layoutRendition?.width && layoutRendition?.height && layoutRendition.height > layoutRendition.width,
  );

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

  // Prepare next item (poster + video metadata) while current media is open.
  useEffect(() => {
    if (!Array.isArray(photos) || typeof currentIndex !== 'number') return undefined;
    let cancelled = false;
    preloadNextMedia(currentIndex, photos, (item) => {
      if (String(item?.mediaType || '').toUpperCase() !== 'VIDEO') {
        return { posterUrl: item?.thumbnailUrl || item?.previewUrl || null, sources: [], progressive: [] };
      }
      return getProgressiveVideoSources(item);
    }).catch(() => {});
    return () => {
      cancelled = true;
      void cancelled;
    };
  }, [photos, currentIndex, photo?.id]);

  if (!photo) return null;

  return (
    <div
      className="photo-lightbox"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Media preview"
    >
      <div className="photo-lightbox__topbar" onClick={(e) => e.stopPropagation()}>
        <div className="photo-lightbox__topbar-info">
          {positionLabel && (
            <span className="photo-lightbox__position" aria-live="polite">{positionLabel}</span>
          )}
          {photo.caption && (
            <span className="photo-lightbox__topbar-caption" title={photo.caption}>
              {photo.caption}
            </span>
          )}
        </div>
        <button
          type="button"
          className="photo-lightbox__close"
          onClick={onClose}
          aria-label="Close preview"
        >
          <X size={22} />
        </button>
      </div>

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
        <div
          className={`photo-lightbox__media-stage${
            isVideo
              ? ` photo-lightbox__media-stage--video${isPortraitVideo ? ' is-portrait' : ' is-landscape'}`
              : ''
          }`}
          style={isVideo ? videoLayoutStyle : undefined}
        >
          {isVideo ? (
            videoReady ? (
              <WebVideoPlayer
                key={photo.id}
                className="photo-lightbox__video"
                media={photo}
                poster={posterUrl}
                renditions={videoRenditions}
                maxQuality={maxQuality}
              />
            ) : (
              <div className="photo-lightbox__video-processing photo-lightbox__video-shell">
                {posterUrl ? (
                  <img
                    className="web-video-player__poster"
                    src={posterUrl}
                    alt=""
                    aria-hidden
                  />
                ) : null}
                <div className="photo-lightbox__video-processing-body">
                  <span className="photo-lightbox__processing-spinner" aria-hidden />
                  <p>Video is still processing…</p>
                  <div className="photo-lightbox__processing-placeholder" aria-hidden>
                    <ImageIcon size={32} />
                  </div>
                </div>
              </div>
            )
          ) : (
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
          )}
        </div>
        <div className="photo-lightbox__info">
          {photo.caption ? (
            <p className="photo-lightbox__caption">{photo.caption}</p>
          ) : null}
          <p className="photo-lightbox__meta">
            {[photo.schoolName, photo.className, photo.teacherName].filter(Boolean).join(' · ')}
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
