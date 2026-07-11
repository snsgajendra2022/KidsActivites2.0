import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, MoreVertical } from 'lucide-react';
import {
  buildProgressiveSrcChain,
  getGalleryThumbSrc,
  imageNeedsVariantPolling,
  preloadImageSrc,
} from '../../../utils/photoStudioProgressive.js';
import { rewritePhotoStudioUrl } from '../../../utils/photoStudioUrls.js';
import { resolvePhotoDownloadUrl } from '../../../utils/photoStudioDownload.js';
import { isVideoItem } from './utils.js';
import MediaCardActions from './MediaCardActions.jsx';

export default function MediaCard({
  image,
  localPreviewUrl,
  viewMode = 'grid',
  onOpen,
  onDelete,
  onDownload,
  onReplace,
  onAddToAlbum,
  canAddToAlbum,
  adding,
  downloading,
  replacing,
  isHighlighted,
}) {
  const isVideo = isVideoItem(image);
  const processing = imageNeedsVariantPolling(image);
  const serverChain = useMemo(() => {
    if (isVideo) {
      const url = rewritePhotoStudioUrl(image.thumbnailUrl || image.previewUrl || '');
      return url ? [url] : [];
    }
    const chain = buildProgressiveSrcChain(image).map(rewritePhotoStudioUrl).filter(Boolean);
    if (imageNeedsVariantPolling(image)) {
      const direct = rewritePhotoStudioUrl(
        image.thumbnailUrl || image.previewUrl || image.downloadUrl || image?.variants?.previewFallbackUrl || '',
      );
      if (direct && !chain.includes(direct)) return [direct, ...chain];
    }
    return chain;
  }, [image, isVideo]);
  const serverSrc = serverChain[0] || (isVideo
    ? rewritePhotoStudioUrl(image.thumbnailUrl || image.previewUrl || '')
    : getGalleryThumbSrc(image));
  const [src, setSrc] = useState(() => localPreviewUrl || serverSrc || '');
  const [chainIndex, setChainIndex] = useState(0);
  const [serverReady, setServerReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    // Reset progressive src when image identity or URLs change
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChainIndex(0);
    setServerReady(false);
    if (localPreviewUrl) {
      setSrc(localPreviewUrl);
      return;
    }
    setSrc(serverSrc || '');
  }, [
    image.id,
    localPreviewUrl,
    serverSrc,
    image.previewUrl,
    image.thumbnailUrl,
    image.downloadUrl,
    image.mediaType,
    isVideo,
    image.variants,
  ]);

  useEffect(() => {
    if (!localPreviewUrl || serverChain.length === 0) return undefined;
    let cancelled = false;
    const tryServer = async () => {
      for (let i = 0; i < serverChain.length; i += 1) {
        if (cancelled) break;
        const ok = await preloadImageSrc(serverChain[i]);
        if (ok && !cancelled) {
          setSrc(serverChain[i]);
          setChainIndex(i);
          setServerReady(true);
          break;
        }
      }
    };
    tryServer();
    return () => { cancelled = true; };
  }, [localPreviewUrl, serverChain]);

  useEffect(() => {
    if (localPreviewUrl || !serverSrc) return undefined;
    let cancelled = false;
    const tryServer = async () => {
      for (let i = 0; i < serverChain.length; i += 1) {
        if (cancelled) break;
        const ok = await preloadImageSrc(serverChain[i]);
        if (ok && !cancelled) {
          setSrc(serverChain[i]);
          setChainIndex(i);
          setServerReady(true);
          break;
        }
      }
    };
    tryServer();
    return () => { cancelled = true; };
  }, [localPreviewUrl, serverSrc, serverChain]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

  const handleImageError = () => {
    if (localPreviewUrl && !serverReady) {
      setSrc(localPreviewUrl);
      return;
    }
    const nextIndex = chainIndex + 1;
    if (nextIndex < serverChain.length) {
      setChainIndex(nextIndex);
      setSrc(serverChain[nextIndex]);
      return;
    }
    if (localPreviewUrl) {
      setSrc(localPreviewUrl);
    }
  };

  const showProcessing = processing && !localPreviewUrl && !serverReady;
  const canDownload = Boolean(resolvePhotoDownloadUrl(image) || localPreviewUrl || image?.id);
  const canReplace = !isVideo && Boolean(onReplace);

  return (
    <article
      className={`photo-media-card photo-media-card--${viewMode}${isHighlighted ? ' photo-media-card--highlighted' : ''}`}
      data-photo-id={image.id}
    >
      {isHighlighted && (
        <span className="photo-media-card__badge">Just uploaded</span>
      )}
      {isVideo && (
        <span className="photo-media-card__type-badge" aria-label="Video">Video</span>
      )}
      {processing && (
        <span className="photo-media-card__status-badge" aria-label="Processing">Processing</span>
      )}

      <button
        type="button"
        className="photo-media-card__media"
        onClick={() => onOpen(image)}
        aria-label={`View ${image.filename}`}
      >
        {src ? (
          <>
            <img
              src={src}
              alt=""
              loading={isHighlighted ? 'eager' : 'lazy'}
              decoding="async"
              onError={handleImageError}
            />
            {isVideo && (
              <span className="photo-media-card__play" aria-hidden>
                <Play size={viewMode === 'compact' ? 22 : 28} fill="currentColor" />
              </span>
            )}
            {showProcessing && (
              <span className="photo-media-card__processing">Processing…</span>
            )}
          </>
        ) : (
          <div className="photo-media-card__placeholder" aria-hidden />
        )}
      </button>

      <div className="photo-media-card__footer">
        <p className="photo-media-card__name" title={image.filename}>{image.filename}</p>
        <div className="photo-media-card__menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="photo-media-card__menu-btn"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            aria-label={`Actions for ${image.filename}`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <MediaCardActions
              image={image}
              canAddToAlbum={canAddToAlbum}
              canDownload={canDownload}
              canReplace={canReplace}
              adding={adding}
              downloading={downloading}
              replacing={replacing}
              onAddToAlbum={() => { setMenuOpen(false); onAddToAlbum?.(image); }}
              onDownload={() => { setMenuOpen(false); onDownload?.(image); }}
              onReplace={() => { setMenuOpen(false); onReplace?.(image); }}
              onDelete={() => { setMenuOpen(false); onDelete(image); }}
              onClose={() => setMenuOpen(false)}
            />
          )}
        </div>
      </div>
    </article>
  );
}
