import { useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { useProgressiveImageSrc } from '../../hooks/useProgressiveImageSrc.js';
import { isVideoPlaybackReady, resolveVideoStreamUrl } from '../../utils/photoStudioProgressive.js';
import { normalizeVideoMediaItem, resolveLayoutRendition } from '../../utils/videoMediaNormalize.js';
import VideoHlsPlayer from './VideoHlsPlayer.jsx';
import '../../styles/photo-lightbox.css';
import '../../styles/progressive-image.css';

export default function PhotoLightbox({
  photo,
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

  const studioImage = photo?.studioImage || (photo?.variants ? photo : null);
  const streamUrl = useMemo(
    () => normalizedVideo?.masterStreamUrl || resolveVideoStreamUrl(photo),
    [normalizedVideo, photo],
  );
  const isVideo = photo?.mediaType === 'VIDEO' && Boolean(streamUrl);
  const videoReady = isVideo && isVideoPlaybackReady(photo);
  const { src: progressiveSrc, loading, qualityLabel } = useProgressiveImageSrc(
    studioImage,
    { enabled: !!studioImage && !isVideo },
  );
  const imgSrc = studioImage
    ? progressiveSrc
    : (photo?.previewUrl || photo?.thumbnailUrl || photo?.imageUrl);

  const videoRenditions = useMemo(
    () => normalizedVideo?.renditions ?? (Array.isArray(photo?.renditions) ? photo.renditions : []),
    [normalizedVideo, photo],
  );

  const defaultQuality = normalizedVideo?.defaultQuality;

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
              <VideoHlsPlayer
                className="photo-lightbox__video"
                src={streamUrl}
                poster={photo.thumbnailUrl || photo.previewUrl || undefined}
                renditions={videoRenditions}
                defaultQuality={defaultQuality}
              />
            ) : (
              <div className="photo-lightbox__video-processing photo-lightbox__video-shell">
                <div className="photo-lightbox__video-processing-body">
                  <span className="photo-lightbox__processing-spinner" aria-hidden />
                  <p>Video is still processing…</p>
                  {photo.thumbnailUrl ? (
                    <img
                      src={photo.thumbnailUrl}
                      alt=""
                      className="photo-lightbox__video-processing-thumb"
                    />
                  ) : (
                    <div className="photo-lightbox__processing-placeholder" aria-hidden>
                      <ImageIcon size={32} />
                    </div>
                  )}
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
