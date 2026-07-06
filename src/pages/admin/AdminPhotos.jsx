import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Upload, Trash2, RefreshCw, Download, AlertCircle, Play, FolderPlus } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import PhotoLightbox from '../../components/media/PhotoLightbox.jsx';
import { ConfirmModal } from '../../components/ui/Modal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  deletePhotoStudioImage,
  getPhotoStudioConfig,
  listPhotoStudioImages,
} from '../../services/photoStudioService.js';
import { listAdminAlbums, uploadAdminAlbumMedia, linkExistingToAlbum } from '../../services/classAlbumService.js';
import { rewritePhotoStudioUrl } from '../../utils/photoStudioUrls.js';
import {
  getGalleryThumbSrc,
  imageNeedsVariantPolling,
} from '../../utils/photoStudioProgressive.js';
import '../../styles/admin-photos.css';

const ACCEPTED_MEDIA = 'image/*,video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm';

function isVideoItem(item) {
  return item?.mediaType === 'VIDEO';
}

function isAcceptedMediaFile(file) {
  if (!file) return false;
  if (file.type.startsWith('image/') || file.type.startsWith('video/')) return true;
  const name = (file.name || '').toLowerCase();
  return ['.mp4', '.mov', '.webm', '.m4v'].some((ext) => name.endsWith(ext));
}

const PAGE_SIZE = 20;

function getLocalDateKey(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatGroupDateLabel(iso) {
  const photoDay = getLocalDateKey(iso);
  const now = new Date();
  const todayKey = getLocalDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);

  if (photoDay === todayKey) return 'Today';
  if (photoDay === yesterdayKey) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function groupImagesByDay(images) {
  const groups = new Map();
  images.forEach((img) => {
    const key = getLocalDateKey(img.uploadTime);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(img);
  });
  return Array.from(groups.entries()).map(([dateKey, items]) => ({
    dateKey,
    label: formatGroupDateLabel(items[0].uploadTime),
    images: items,
  }));
}

function dedupeImages(images) {
  const seen = new Set();
  return images.filter((img) => {
    const key = `${img.id}|${img.previewUrl}|${img.uploadTime}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toLightboxPhoto(img) {
  const isVideo = isVideoItem(img);
  return {
    id: img.id,
    mediaType: img.mediaType || (isVideo ? 'VIDEO' : 'IMAGE'),
    imageUrl: img.previewUrl || img.thumbnailUrl || img.downloadUrl,
    previewUrl: img.previewUrl,
    streamUrl: img.streamUrl,
    thumbnailUrl: img.thumbnailUrl,
    processingStatus: img.processingStatus || img.status,
    videoId: img.videoId,
    renditions: img.renditions,
    caption: img.filename,
    teacherName: isVideo ? 'VIDEO' : img.fileType?.toUpperCase(),
    className: img.uploadTime
      ? new Date(img.uploadTime).toLocaleString('en-IN')
      : '',
    variants: img.variants,
    studioImage: isVideo ? null : img,
  };
}

function GalleryCard({ image, onOpen, onDelete, onAddToAlbum, canAddToAlbum, adding }) {
  const isVideo = isVideoItem(image);
  const lowestSrc = isVideo
    ? rewritePhotoStudioUrl(image.thumbnailUrl || image.previewUrl || '')
    : getGalleryThumbSrc(image);
  const fallbackSrc = rewritePhotoStudioUrl(
    image.thumbnailUrl || image.previewUrl || image.downloadUrl || '',
  );
  const [src, setSrc] = useState(lowestSrc);

  useEffect(() => {
    const next = isVideo
      ? (image.thumbnailUrl || image.previewUrl || '')
      : getGalleryThumbSrc(image);
    setSrc((prev) => (prev === next ? prev : next));
  }, [
    image.id,
    image.previewUrl,
    image.thumbnailUrl,
    image.downloadUrl,
    image.mediaType,
    isVideo,
    JSON.stringify(image?.variants ?? null),
  ]);

  return (
    <article className="admin-photos-card">
      <button
        type="button"
        className="admin-photos-card__media"
        onClick={() => onOpen(image)}
        aria-label={`View ${image.filename}`}
      >
        {src ? (
          <>
            <img
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => {
                if (fallbackSrc && src !== fallbackSrc) setSrc(fallbackSrc);
              }}
            />
            {isVideo && (
              <span className="admin-photos-card__play" aria-hidden>
                <Play size={28} fill="currentColor" />
              </span>
            )}
            {isVideo && image.processingStatus === 'PROCESSING' && (
              <span className="admin-photos-card__processing">Processing…</span>
            )}
          </>
        ) : (
          <div className="admin-photos-card__placeholder" aria-hidden />
        )}
      </button>
      <div className="admin-photos-card__body">
        <p className="admin-photos-card__name" title={image.filename}>{image.filename}</p>
        <div className="admin-photos-card__actions">
          {canAddToAlbum && (
            <button
              type="button"
              className="admin-photos-card__btn admin-photos-card__btn--primary"
              disabled={adding}
              onClick={(e) => { e.stopPropagation(); onAddToAlbum?.(image); }}
              aria-label="Add to album"
              title="Add to selected album"
            >
              <FolderPlus size={14} />
            </button>
          )}
          {image.downloadUrl && (
            <a
              href={image.downloadUrl}
              className="admin-photos-card__btn"
              download
              target="_blank"
              rel="noreferrer"
              aria-label="Download"
              onClick={(e) => e.stopPropagation()}
            >
              <Download size={14} />
            </a>
          )}
          <button
            type="button"
            className="admin-photos-card__btn admin-photos-card__btn--danger"
            onClick={(e) => { e.stopPropagation(); onDelete(image); }}
            aria-label="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AdminPhotos() {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [config, setConfig] = useState(null);
  const [images, setImages] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [albums, setAlbums] = useState([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [linkingId, setLinkingId] = useState(null);

  const loadPage = useCallback(async (pageNum, { append = false } = {}) => {
    const data = await listPhotoStudioImages({ page: pageNum, size: PAGE_SIZE });
    const batch = data?.images || [];
    setImages((prev) => dedupeImages(append ? [...prev, ...batch] : batch));
    setPage(data?.page ?? pageNum);
    setTotalPages(data?.totalPages ?? 1);
    return data;
  }, []);

  const photosReady = Boolean(config?.configured);

  const refreshGallery = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const cfg = await getPhotoStudioConfig();
      setConfig(cfg);
      if (!cfg?.configured) {
        setImages([]);
        return;
      }
      await loadPage(0);
    } catch (err) {
      setError(err?.message || 'Failed to load photos.');
    } finally {
      setLoading(false);
    }
  }, [loadPage]);

  useEffect(() => {
    refreshGallery();
  }, [refreshGallery]);

  useEffect(() => {
    if (!photosReady) return;
    listAdminAlbums()
      .then((data) => setAlbums(Array.isArray(data) ? data : []))
      .catch(() => setAlbums([]));
  }, [photosReady]);

  const sortedImages = useMemo(
    () => [...images].sort((a, b) => new Date(b.uploadTime) - new Date(a.uploadTime)),
    [images],
  );

  const needsVariantPolling = useMemo(() => {
    if (lightboxIndex < 0) return false;
    const active = sortedImages[lightboxIndex];
    return !!active && imageNeedsVariantPolling(active);
  }, [lightboxIndex, sortedImages]);

  useEffect(() => {
    if (!needsVariantPolling || !photosReady || lightboxIndex < 0) return undefined;

    const activeId = sortedImages[lightboxIndex]?.id;

    const poll = async () => {
      try {
        const data = await listPhotoStudioImages({ page: 0, size: PAGE_SIZE });
        const updated = (data?.images || []).find((img) => img.id === activeId);
        if (!updated) return;
        setImages((prev) => prev.map((img) => (img.id === activeId ? updated : img)));
      } catch {
        // ignore polling errors
      }
    };

    const timer = setInterval(poll, 4000);
    return () => clearInterval(timer);
  }, [needsVariantPolling, photosReady, lightboxIndex, sortedImages.length, sortedImages[lightboxIndex]?.id]);

  const imageGroups = useMemo(() => groupImagesByDay(sortedImages), [sortedImages]);
  const lightboxPhotos = useMemo(() => sortedImages.map(toLightboxPhoto), [sortedImages]);
  const lightboxPhoto = lightboxIndex >= 0 ? lightboxPhotos[lightboxIndex] : null;
  const hasMore = page + 1 < totalPages;

  const openLightbox = useCallback((image) => {
    const idx = sortedImages.findIndex((img) => img.id === image.id);
    if (idx >= 0) setLightboxIndex(idx);
  }, [sortedImages]);

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      await loadPage(page + 1, { append: true });
    } catch (err) {
      toast(err?.message || 'Failed to load more photos.', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const selectedAlbum = useMemo(
    () => albums.find((album) => album.id === selectedAlbumId) || null,
    [albums, selectedAlbumId],
  );

  const handleUploadFiles = async (fileList) => {
    if (!photosReady) {
      toast('Photo storage is not connected for this workspace yet.', 'warning');
      return;
    }
    const files = Array.from(fileList || []).filter(isAcceptedMediaFile);
    if (files.length === 0) {
      toast('Please choose image or video files (MP4, MOV, WebM).', 'warning');
      return;
    }
    if (!selectedAlbumId) {
      toast('Choose a class album before uploading.', 'warning');
      return;
    }

    setUploading(true);
    try {
      await uploadAdminAlbumMedia({
        albumId: selectedAlbumId,
        caption: uploadCaption.trim() || undefined,
        files,
      });
      const albumLabel = selectedAlbum?.className || selectedAlbum?.albumName || 'album';
      toast(
        files.length === 1
          ? `Added to ${albumLabel}.`
          : `${files.length} files added to ${albumLabel}.`,
        'success',
      );
      await loadPage(0);
    } catch (err) {
      toast(err?.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddExistingToAlbum = async (image) => {
    if (!selectedAlbumId || !image?.id) {
      toast('Select a class album first.', 'warning');
      return;
    }
    setLinkingId(image.id);
    try {
      await linkExistingToAlbum({
        albumId: selectedAlbumId,
        externalAssetIds: [String(image.id)],
        caption: uploadCaption.trim() || image.filename,
      });
      const albumLabel = selectedAlbum?.className || selectedAlbum?.albumName || 'album';
      toast(`Added to ${albumLabel}.`, 'success');
    } catch (err) {
      toast(err?.message || 'Could not add to album.', 'error');
    } finally {
      setLinkingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await deletePhotoStudioImage(deleteTarget.id);
      setImages((prev) => prev.filter((img) => img.id !== deleteTarget.id));
      toast('Photo deleted.', 'success');
      setDeleteTarget(null);
    } catch (err) {
      toast(err?.message || 'Delete failed.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleUploadFiles(e.dataTransfer.files);
  };

  return (
    <DashboardLayout>
      <div className="admin-photos-page">
        <PageHeader
          title="Photo Sharing"
          subtitle="Browse your media library, pick a class album, then upload new files or add existing photos/videos with the + button on each item."
          icon={Image}
        />

        {!loading && config?.tenantConnected && (
          <p className="admin-photos-status">
            Cloud storage connected
            {config.filevaultUsername ? ` (${config.filevaultUsername})` : ''}
          </p>
        )}

        {!loading && config && !photosReady && (
          <div className="admin-photos-alert">
            <AlertCircle size={20} />
            <div>
              <strong>Photo storage not available</strong>
              {config.connectionStatus === 'FAILED' ? (
                <p>
                  Cloud setup failed for this workspace
                  {config.statusMessage ? `: ${config.statusMessage}` : '.'}
                  {' '}Contact your administrator to retry provisioning.
                </p>
              ) : (
                <p>
                  This school workspace does not have cloud photo storage connected yet.
                  It is created automatically when the workspace is provisioned.
                </p>
              )}
            </div>
          </div>
        )}

        {photosReady && (
          <section
            className={`admin-photos-upload ${dragOver ? 'is-dragover' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <div className="admin-photos-upload__options">
              <label className="admin-photos-upload__field">
                <span>Class album</span>
                <select
                  value={selectedAlbumId}
                  onChange={(e) => setSelectedAlbumId(e.target.value)}
                  disabled={uploading || albums.length === 0}
                >
                  <option value="">
                    {albums.length === 0 ? 'No albums available' : 'Select a class album…'}
                  </option>
                  {albums.map((album) => (
                    <option key={album.id} value={album.id}>
                      {album.className || album.albumName}
                      {album.albumName && album.className ? ` — ${album.albumName}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-photos-upload__field">
                <span>Caption (optional)</span>
                <input
                  type="text"
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder="e.g. Sports day"
                  maxLength={200}
                  disabled={uploading}
                />
              </label>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_MEDIA}
              multiple
              className="admin-photos-upload__input"
              onChange={(e) => handleUploadFiles(e.target.files)}
            />
            <Upload size={22} />
            <p>
              {selectedAlbum
                ? `Target: ${selectedAlbum.className || selectedAlbum.albumName}. Upload new files or use + on items below to add existing media.`
                : 'Select a class album above, then upload or add existing items from the library.'}
            </p>
            <Button
              type="button"
              variant="secondary"
              disabled={uploading || !selectedAlbumId}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? 'Uploading…' : 'Choose files'}
            </Button>
          </section>
        )}

        {error && (
          <div className="admin-photos-error">
            <p>{error}</p>
            <Button type="button" variant="secondary" onClick={refreshGallery}>
              <RefreshCw size={16} />
              Retry
            </Button>
          </div>
        )}

        {loading ? (
          <div className="admin-photos-grid admin-photos-grid--loading">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="admin-photos-skeleton" />
            ))}
          </div>
        ) : photosReady && sortedImages.length === 0 && !error ? (
          <div className="admin-photos-empty">
            <Image size={28} strokeWidth={1.75} />
            <h2>No media yet</h2>
            <p>Select a class album above and upload your first photos or videos.</p>
          </div>
        ) : (
          photosReady && !error && (
            <>
              {imageGroups.map((group) => (
                <section key={group.dateKey} className="admin-photos-group">
                  <h3 className="admin-photos-group__title">{group.label}</h3>
                  <div className="admin-photos-grid">
                    {group.images.map((image) => (
                      <GalleryCard
                        key={image.id}
                        image={image}
                        onOpen={openLightbox}
                        onDelete={setDeleteTarget}
                        onAddToAlbum={handleAddExistingToAlbum}
                        canAddToAlbum={Boolean(selectedAlbumId)}
                        adding={linkingId === image.id}
                      />
                    ))}
                  </div>
                </section>
              ))}

              {hasMore && (
                <div className="admin-photos-load-more">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </Button>
                </div>
              )}
            </>
          )
        )}
      </div>

      <PhotoLightbox
        photo={lightboxPhoto}
        onClose={() => setLightboxIndex(-1)}
        onPrev={() => setLightboxIndex((i) => (i > 0 ? i - 1 : i))}
        onNext={() => setLightboxIndex((i) => (i < lightboxPhotos.length - 1 ? i + 1 : i))}
        hasPrev={lightboxIndex > 0}
        hasNext={lightboxIndex >= 0 && lightboxIndex < lightboxPhotos.length - 1}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget?.mediaType === 'VIDEO' ? 'Delete video?' : 'Delete photo?'}
        message={deleteTarget ? `Remove "${deleteTarget.filename}"? This cannot be undone.` : ''}
        confirmText="Delete"
        loading={deleting}
      />
    </DashboardLayout>
  );
}
