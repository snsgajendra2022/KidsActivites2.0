import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Upload, Trash2, RefreshCw, Download, AlertCircle } from 'lucide-react';
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
  uploadPhotoStudioImage,
} from '../../services/photoStudioService.js';
import {
  getGalleryThumbSrc,
  imageNeedsVariantPolling,
} from '../../utils/photoStudioProgressive.js';
import '../../styles/admin-photos.css';

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
  return {
    id: img.id,
    imageUrl: img.previewUrl || img.downloadUrl,
    previewUrl: img.previewUrl,
    caption: img.filename,
    teacherName: img.fileType?.toUpperCase(),
    className: img.uploadTime
      ? new Date(img.uploadTime).toLocaleString('en-IN')
      : '',
    variants: img.variants,
    studioImage: img,
  };
}

function GalleryCard({ image, onOpen, onDelete }) {
  const lowestSrc = getGalleryThumbSrc(image);
  const fallbackSrc = image.previewUrl || image.downloadUrl || '';
  const [src, setSrc] = useState(lowestSrc);

  useEffect(() => {
    setSrc(getGalleryThumbSrc(image));
  }, [image]);

  return (
    <article className="admin-photos-card">
      <button
        type="button"
        className="admin-photos-card__media"
        onClick={() => onOpen(image)}
        aria-label={`View ${image.filename}`}
      >
        {src ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => {
              if (fallbackSrc && src !== fallbackSrc) setSrc(fallbackSrc);
            }}
          />
        ) : (
          <div className="admin-photos-card__placeholder" aria-hidden />
        )}
      </button>
      <div className="admin-photos-card__body">
        <p className="admin-photos-card__name" title={image.filename}>{image.filename}</p>
        <div className="admin-photos-card__actions">
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

  const loadPage = useCallback(async (pageNum, { append = false } = {}) => {
    const data = await listPhotoStudioImages({ page: pageNum, size: PAGE_SIZE });
    const batch = data?.images || [];
    setImages((prev) => dedupeImages(append ? [...prev, ...batch] : batch));
    setPage(data?.page ?? pageNum);
    setTotalPages(data?.totalPages ?? 1);
    return data;
  }, []);

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
    if (!needsVariantPolling || !config?.configured || lightboxIndex < 0) return undefined;

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
  }, [needsVariantPolling, config?.configured, lightboxIndex, sortedImages]);

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

  const handleUploadFiles = async (fileList) => {
    if (!config?.configured) {
      toast('Photo Studio is not configured on the server.', 'warning');
      return;
    }
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) {
      toast('Please choose image files.', 'warning');
      return;
    }

    setUploading(true);
    try {
      for (const file of files) {
        await uploadPhotoStudioImage(file);
      }
      toast(files.length === 1 ? 'Photo uploaded.' : `${files.length} photos uploaded.`, 'success');
      await loadPage(0);
    } catch (err) {
      toast(err?.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
          subtitle="Upload and manage your school photo library via Photo Studio."
          icon={Image}
        />

        {!loading && config && !config.configured && (
          <div className="admin-photos-alert">
            <AlertCircle size={20} />
            <div>
              <strong>Photo Studio not configured</strong>
              <p>
                Set <code>PHOTO_STUDIO_API_TOKEN</code> on the backend, then restart the server.
                API base: {config.baseUrl}
              </p>
            </div>
          </div>
        )}

        {config?.configured && (
          <section
            className={`admin-photos-upload ${dragOver ? 'is-dragover' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="admin-photos-upload__input"
              onChange={(e) => handleUploadFiles(e.target.files)}
            />
            <Upload size={22} />
            <p>Drag &amp; drop photos here, or</p>
            <Button
              type="button"
              variant="secondary"
              disabled={uploading}
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
        ) : config?.configured && sortedImages.length === 0 && !error ? (
          <div className="admin-photos-empty">
            <Image size={28} strokeWidth={1.75} />
            <h2>No photos yet</h2>
            <p>Upload your first classroom or event photos above.</p>
          </div>
        ) : (
          config?.configured && !error && (
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
        title="Delete photo?"
        message={deleteTarget ? `Remove "${deleteTarget.filename}" from Photo Studio? This cannot be undone.` : ''}
        confirmText="Delete"
        loading={deleting}
      />
    </DashboardLayout>
  );
}
