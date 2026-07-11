import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Upload, Trash2, RefreshCw, Download, AlertCircle, Play, FolderPlus, Replace } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import PhotoLightbox from '../../components/media/PhotoLightbox.jsx';
import { ConfirmModal } from '../../components/ui/Modal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  deletePhotoStudioImage,
  getPhotoStudioConfig,
  listPhotoStudioImages,
  replacePhotoStudioImage,
} from '../../services/photoStudioService.js';
import { listAdminAlbums, uploadAdminAlbumMedia, linkExistingToAlbum, UPLOAD_TARGETS } from '../../services/classAlbumService.js';
import { ApiError } from '../../services/api/client.js';
import { rewritePhotoStudioUrl } from '../../utils/photoStudioUrls.js';
import { downloadPhotoStudioAsset, resolvePhotoDownloadUrl } from '../../utils/photoStudioDownload.js';
import {
  buildProgressiveSrcChain,
  galleryNeedsVariantPolling,
  getGalleryThumbSrc,
  imageNeedsVariantPolling,
  preloadImageSrc,
  resolveVideoStreamUrl,
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

function collectUploadResultIds(response) {
  if (!response) return [];
  const ids = [];
  const lists = [response, response.images, response.media, response.uploaded, response.items, response.data]
    .filter((entry) => Array.isArray(entry));
  lists.forEach((list) => {
    list.forEach((item) => {
      const id = item?.id ?? item?.imageId ?? item?.externalAssetId ?? item?.assetId;
      if (id != null) ids.push(String(id));
    });
  });
  if (response.id != null) ids.push(String(response.id));
  return [...new Set(ids)];
}

function detectNewlyUploadedIds(beforeIds, batch, uploadedFiles, uploadResult) {
  const fromResponse = collectUploadResultIds(uploadResult);
  if (fromResponse.length > 0) return fromResponse;

  const byNewId = batch
    .filter((img) => !beforeIds.has(String(img.id)))
    .map((img) => String(img.id));
  if (byNewId.length > 0) return byNewId;

  const uploadedNames = new Set(uploadedFiles.map((f) => f.name.toLowerCase()));
  const byFilename = batch
    .filter((img) => uploadedNames.has((img.filename || '').toLowerCase()))
    .map((img) => String(img.id));
  if (byFilename.length > 0) return byFilename;

  const sorted = [...batch].sort((a, b) => new Date(b.uploadTime) - new Date(a.uploadTime));
  return sorted.slice(0, uploadedFiles.length).map((img) => String(img.id));
}

function toLightboxPhoto(img) {
  const isVideo = isVideoItem(img);
  const streamUrl = resolveVideoStreamUrl(img);
  return {
    id: img.id,
    mediaType: img.mediaType || (isVideo ? 'VIDEO' : 'IMAGE'),
    imageUrl: img.previewUrl || img.thumbnailUrl || img.downloadUrl,
    previewUrl: img.previewUrl,
    streamUrl,
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

function isImageFile(file) {
  if (!file) return false;
  if (file.type.startsWith('image/')) return true;
  const name = (file.name || '').toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.heic', '.heif'].some((ext) => name.endsWith(ext));
}

function createFilePreviewUrls(files) {
  return files.map((file) => (isImageFile(file) ? URL.createObjectURL(file) : null));
}

function assignPreviewsByIndex(filePreviews, ids) {
  const previews = {};
  ids.forEach((id, index) => {
    const preview = filePreviews[index];
    if (id && preview) previews[String(id)] = preview;
  });
  return previews;
}

function assignPreviewsByFilename(files, filePreviews, batch) {
  const previews = {};
  const idsByFilename = new Map(
    batch.map((img) => [(img.filename || '').toLowerCase(), String(img.id)]),
  );
  files.forEach((file, index) => {
    const preview = filePreviews[index];
    if (!preview) return;
    const id = idsByFilename.get(file.name.toLowerCase());
    if (id) previews[id] = preview;
  });
  return previews;
}

function resolveLocalPreview(image, previewsById, previewsByFilename) {
  const byId = previewsById[String(image?.id)];
  if (byId) return byId;
  const name = (image?.filename || '').toLowerCase();
  return name ? previewsByFilename[name] : undefined;
}

function extractImagesFromUploadResult(uploadResult) {
  if (!uploadResult) return [];
  const lists = [
    uploadResult.images,
    uploadResult.media,
    uploadResult.uploaded,
    uploadResult.items,
    uploadResult.data,
  ].filter((entry) => Array.isArray(entry));
  const images = lists.flat().filter((item) => item?.id != null || item?.imageId != null);
  if (images.length > 0) {
    return images.map((item) => ({
      ...item,
      id: item.id ?? item.imageId ?? item.externalAssetId,
    }));
  }
  if (uploadResult.id != null || uploadResult.imageId != null) {
    return [{
      ...uploadResult,
      id: uploadResult.id ?? uploadResult.imageId,
    }];
  }
  return [];
}

async function waitForGalleryRefresh(loadPage, beforeIds, uploadResult, files, { attempts = 6 } = {}) {
  let lastData = null;
  let lastBatch = [];

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, attempt < 3 ? 800 : 1500));
    }
    // eslint-disable-next-line no-await-in-loop
    lastData = await loadPage(0);
    lastBatch = lastData?.images || [];
    const responseIds = collectUploadResultIds(uploadResult);
    const hasResponseIds = responseIds.length > 0
      && responseIds.every((id) => lastBatch.some((img) => String(img.id) === String(id)));
    const hasNewIds = lastBatch.some((img) => !beforeIds.has(String(img.id)));
    const hasFilenameMatch = files.some((file) => lastBatch.some(
      (img) => (img.filename || '').toLowerCase() === file.name.toLowerCase(),
    ));
    if (hasResponseIds || hasNewIds || hasFilenameMatch) {
      return { data: lastData, batch: lastBatch };
    }
  }

  return { data: lastData, batch: lastBatch };
}

function GalleryCard({
  image,
  localPreviewUrl,
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

  useEffect(() => {
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
    JSON.stringify(image?.variants ?? null),
  ]);

  useEffect(() => {
    if (!localPreviewUrl || serverChain.length === 0) return undefined;
    let cancelled = false;
    const tryServer = async () => {
      for (let i = 0; i < serverChain.length; i += 1) {
        if (cancelled) break;
        // eslint-disable-next-line no-await-in-loop
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
        // eslint-disable-next-line no-await-in-loop
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
      className={`admin-photos-card${isHighlighted ? ' admin-photos-card--highlighted' : ''}`}
      data-photo-id={image.id}
    >
      {isHighlighted && (
        <span className="admin-photos-card__new-badge">Just uploaded</span>
      )}
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
              loading={isHighlighted ? 'eager' : 'lazy'}
              decoding="async"
              onError={handleImageError}
            />
            {isVideo && (
              <span className="admin-photos-card__play" aria-hidden>
                <Play size={28} fill="currentColor" />
              </span>
            )}
            {showProcessing && (
              <span className="admin-photos-card__processing">Processing…</span>
            )}
          </>
        ) : (
          <div className="admin-photos-card__placeholder" aria-hidden />
        )}
      </button>
        <div className="admin-photos-card__body">
        <p className="admin-photos-card__name" title={image.filename}>{image.filename}</p>
        <div className="media-card-toolbar admin-photos-card__actions">
          {canAddToAlbum && (
            <button
              type="button"
              className="media-card-toolbar__btn admin-photos-card__btn admin-photos-card__btn--primary"
              disabled={adding}
              onClick={(e) => { e.stopPropagation(); onAddToAlbum?.(image); }}
              aria-label="Add to album"
              title="Add to selected album"
            >
              <FolderPlus size={14} />
            </button>
          )}
          {canDownload && (
            <button
              type="button"
              className="media-card-toolbar__btn admin-photos-card__btn"
              disabled={downloading || replacing}
              onClick={(e) => { e.stopPropagation(); onDownload?.(image); }}
              aria-label="Download"
              title="Download"
            >
              <Download size={14} />
            </button>
          )}
          {canReplace && (
            <button
              type="button"
              className="media-card-toolbar__btn admin-photos-card__btn"
              disabled={downloading || replacing}
              onClick={(e) => { e.stopPropagation(); onReplace?.(image); }}
              aria-label="Replace image"
              title="Replace image"
            >
              <Replace size={14} />
            </button>
          )}
          <button
            type="button"
            className="media-card-toolbar__btn admin-photos-card__btn admin-photos-card__btn--danger"
            disabled={downloading || replacing}
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
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const replaceInputRef = useRef(null);
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
  const [downloadingId, setDownloadingId] = useState(null);
  const [replacingId, setReplacingId] = useState(null);
  const [replaceTarget, setReplaceTarget] = useState(null);
  const [highlightedIds, setHighlightedIds] = useState(() => new Set());
  const [localPreviews, setLocalPreviews] = useState({});
  const [localPreviewsByFilename, setLocalPreviewsByFilename] = useState({});
  const localPreviewsRef = useRef(localPreviews);
  const localPreviewsByFilenameRef = useRef(localPreviewsByFilename);

  useEffect(() => {
    localPreviewsRef.current = localPreviews;
  }, [localPreviews]);

  useEffect(() => {
    localPreviewsByFilenameRef.current = localPreviewsByFilename;
  }, [localPreviewsByFilename]);

  useEffect(() => () => {
    Object.values(localPreviewsRef.current).forEach((url) => URL.revokeObjectURL(url));
    Object.values(localPreviewsByFilenameRef.current).forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const revokeLocalPreview = useCallback((id, filename) => {
    setLocalPreviews((prev) => {
      const key = String(id);
      if (!prev[key]) return prev;
      URL.revokeObjectURL(prev[key]);
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (filename) {
      const fileKey = filename.toLowerCase();
      setLocalPreviewsByFilename((prev) => {
        if (!prev[fileKey]) return prev;
        URL.revokeObjectURL(prev[fileKey]);
        const next = { ...prev };
        delete next[fileKey];
        return next;
      });
    }
  }, []);

  const markHighlighted = useCallback((ids) => {
    const next = new Set((ids || []).map(String).filter(Boolean));
    if (next.size === 0) return;
    setHighlightedIds(next);
  }, []);

  useEffect(() => {
    if (highlightedIds.size === 0) return undefined;

    const frame = requestAnimationFrame(() => {
      const firstId = [...highlightedIds][0];
      const el = document.querySelector(`[data-photo-id="${firstId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    const timer = setTimeout(() => setHighlightedIds(new Set()), 10000);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [highlightedIds]);

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

  const galleryPollingNeeded = useMemo(
    () => galleryNeedsVariantPolling(sortedImages) || highlightedIds.size > 0,
    [sortedImages, highlightedIds],
  );

  useEffect(() => {
    if (!galleryPollingNeeded || !photosReady) return undefined;

    const poll = async () => {
      try {
        const data = await listPhotoStudioImages({ page: 0, size: PAGE_SIZE });
        const batch = data?.images || [];
        setImages((prev) => {
          const byId = new Map(batch.map((img) => [String(img.id), img]));
          const merged = prev.map((img) => byId.get(String(img.id)) || img);
          const existingIds = new Set(merged.map((img) => String(img.id)));
          batch.forEach((img) => {
            if (!existingIds.has(String(img.id))) merged.unshift(img);
          });
          return dedupeImages(merged);
        });

        await Promise.all(batch.map(async (img) => {
          const id = String(img.id);
          const hasPreview = localPreviewsRef.current[id]
            || localPreviewsByFilenameRef.current[(img.filename || '').toLowerCase()];
          if (!hasPreview) return;
          const thumb = rewritePhotoStudioUrl(getGalleryThumbSrc(img));
          if (!thumb) return;
          const ok = await preloadImageSrc(thumb);
          if (ok) revokeLocalPreview(id, img.filename);
        }));
      } catch {
        // ignore polling errors
      }
    };

    poll();
    const timer = setInterval(poll, 3000);
    return () => clearInterval(timer);
  }, [galleryPollingNeeded, photosReady, revokeLocalPreview]);

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
    const filePreviews = createFilePreviewUrls(files);
    const previewsByFilename = {};
    files.forEach((file, index) => {
      if (filePreviews[index]) previewsByFilename[file.name.toLowerCase()] = filePreviews[index];
    });
    setLocalPreviewsByFilename((prev) => ({ ...prev, ...previewsByFilename }));

    try {
      const beforeIds = new Set(images.map((img) => String(img.id)));
      const uploadResult = await uploadAdminAlbumMedia({
        albumId: selectedAlbumId,
        classId: selectedAlbum?.classId || null,
        className: selectedAlbum?.className || selectedAlbum?.albumName || null,
        schoolId: user?.schoolId || null,
        schoolName: user?.schoolName || null,
        uploadTarget: selectedAlbum?.classId ? UPLOAD_TARGETS.CLASS_ALBUM : null,
        caption: uploadCaption.trim() || undefined,
        files,
      });

      const uploadedImages = extractImagesFromUploadResult(uploadResult);
      if (uploadedImages.length > 0) {
        setImages((prev) => dedupeImages([...uploadedImages, ...prev]));
      }

      const { batch } = await waitForGalleryRefresh(loadPage, beforeIds, uploadResult, files);
      const newIds = detectNewlyUploadedIds(beforeIds, batch, files, uploadResult);
      const previewsById = {
        ...assignPreviewsByIndex(filePreviews, newIds),
        ...assignPreviewsByFilename(files, filePreviews, batch),
      };

      markHighlighted(newIds);
      setLocalPreviews((prev) => ({ ...prev, ...previewsById }));

      const albumLabel = selectedAlbum?.className || selectedAlbum?.albumName || 'album';
      toast(
        files.length === 1
          ? `Added to ${albumLabel}.`
          : `${files.length} files added to ${albumLabel}.`,
        'success',
      );
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : (err?.message || 'Upload failed.');
      toast(message, 'error');
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
      markHighlighted([String(image.id)]);
    } catch (err) {
      toast(err?.message || 'Could not add to album.', 'error');
    } finally {
      setLinkingId(null);
    }
  };

  const handleDownloadImage = async (image) => {
    if (!image?.id) return;
    setDownloadingId(image.id);
    try {
      if (localPreviews[String(image.id)] || localPreviewsByFilename[(image.filename || '').toLowerCase()]) {
        const blobUrl = localPreviews[String(image.id)]
          || localPreviewsByFilename[(image.filename || '').toLowerCase()];
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = image.filename || `photo-${image.id}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
        return;
      }
      await downloadPhotoStudioAsset(image);
      toast('Download started.', 'success');
    } catch (err) {
      toast(err?.message || 'Download failed.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleReplaceClick = (image) => {
    setReplaceTarget(image);
    replaceInputRef.current?.click();
  };

  const handleReplaceFile = async (fileList) => {
    const image = replaceTarget;
    const file = Array.from(fileList || []).find(isAcceptedMediaFile);
    if (!image?.id || !file) {
      setReplaceTarget(null);
      return;
    }
    if (isVideoItem(image)) {
      toast('Replace is only available for photos.', 'warning');
      setReplaceTarget(null);
      return;
    }

    setReplacingId(image.id);
    const filePreviews = createFilePreviewUrls([file]);
    if (filePreviews[0]) {
      setLocalPreviews((prev) => ({ ...prev, [String(image.id)]: filePreviews[0] }));
    }

    try {
      const result = await replacePhotoStudioImage(image.id, file);
      const replacedId = String(result?.id ?? image.id);
      if (replacedId !== String(image.id)) {
        revokeLocalPreview(image.id, image.filename);
        if (filePreviews[0]) {
          setLocalPreviews((prev) => ({ ...prev, [replacedId]: filePreviews[0] }));
        }
      }
      await loadPage(0);
      markHighlighted([replacedId]);
      toast('Image replaced.', 'success');
    } catch (err) {
      toast(err?.message || 'Replace failed.', 'error');
    } finally {
      setReplacingId(null);
      setReplaceTarget(null);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await deletePhotoStudioImage(deleteTarget.id);
      revokeLocalPreview(deleteTarget.id, deleteTarget.filename);
      setImages((prev) => prev.filter((img) => img.id !== deleteTarget.id));
      setHighlightedIds((prev) => {
        const next = new Set(prev);
        next.delete(String(deleteTarget.id));
        return next;
      });
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

        {photosReady && !loading && (
          <div className="admin-media-stats">
            <div className="admin-media-stat">
              <span className="admin-media-stat__value">{sortedImages.length}</span>
              <span className="admin-media-stat__label">In library</span>
            </div>
            <div className="admin-media-stat">
              <span className="admin-media-stat__value">{albums.length}</span>
              <span className="admin-media-stat__label">Class albums</span>
            </div>
            <div className="admin-media-stat">
              <span className="admin-media-stat__value">
                {sortedImages.filter(isVideoItem).length}
              </span>
              <span className="admin-media-stat__label">Videos</span>
            </div>
          </div>
        )}

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
            className={`admin-photos-upload premium-card ${dragOver ? 'is-dragover' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <div className="admin-photos-upload__options">
              <label className="admin-photos-upload__field">
                <span>Album</span>
                <select
                  value={selectedAlbumId}
                  onChange={(e) => setSelectedAlbumId(e.target.value)}
                  disabled={uploading || albums.length === 0}
                >
                  <option value="">
                    {albums.length === 0 ? 'No albums available' : 'Select an album…'}
                  </option>
                  {albums.map((album) => (
                    <option key={album.id} value={album.id}>
                      {album.albumType === 'CUSTOM' ? album.albumName : (album.className || album.albumName)}
                      {album.albumName && album.className && album.albumType !== 'CUSTOM'
                        ? ` — ${album.albumName}`
                        : ''}
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
            <input
              ref={replaceInputRef}
              type="file"
              accept={ACCEPTED_MEDIA}
              className="admin-photos-upload__input"
              onChange={(e) => handleReplaceFile(e.target.files)}
            />
            <Upload size={22} className="admin-photos-upload__icon" />
            <p>
              {selectedAlbum
                ? `Target: ${selectedAlbum.albumType === 'CUSTOM' ? selectedAlbum.albumName : (selectedAlbum.className || selectedAlbum.albumName)}. Upload new files or use + on items below to add existing media.`
                : 'Select an album above, then upload or add existing items from the library.'}
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
                        localPreviewUrl={resolveLocalPreview(
                          image,
                          localPreviews,
                          localPreviewsByFilename,
                        )}
                        onOpen={openLightbox}
                        onDelete={setDeleteTarget}
                        onDownload={handleDownloadImage}
                        onReplace={handleReplaceClick}
                        onAddToAlbum={handleAddExistingToAlbum}
                        canAddToAlbum={Boolean(selectedAlbumId)}
                        adding={linkingId === image.id}
                        downloading={downloadingId === image.id}
                        replacing={replacingId === image.id}
                        isHighlighted={highlightedIds.has(String(image.id))}
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
