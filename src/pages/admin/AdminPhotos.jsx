import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import Button from '../../components/ui/Button.jsx';
import PhotoLightbox from '../../components/media/PhotoLightbox.jsx';
import ClassroomUploadQueuePanel from '../../components/upload/ClassroomUploadQueuePanel.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import {
  deletePhotoStudioImage,
  getPhotoStudioConfig,
  listPhotoStudioImages,
  replacePhotoStudioImage,
} from '../../services/photoStudioService.js';
import {
  listAdminAlbums,
  linkExistingToAlbum,
  UPLOAD_TARGETS,
} from '../../services/classAlbumService.js';
import {
  filterAcceptedClassroomMediaFiles,
  getMediaUploadLimitHint,
  normalizeUploadLimits,
  resolveMediaUploadError,
  validateMediaUploadFile,
  validateMediaUploadFiles,
} from '../../utils/mediaUploadLimits.js';
import {
  classroomUploadManager,
  MAX_UPLOAD_QUEUE,
  LARGE_FILE_BYTES,
  UPLOAD_ENDPOINT,
  isAdminQueueItem,
} from '../../utils/classroomUploadQueue.js';
import { prepareFilesForUpload } from '../../utils/compressClassroomImage.js';
import { getUploadTuning, probeUploadBandwidth } from '../../services/uploadBandwidthService.js';
import { useUploadBandwidth } from '../../hooks/useUploadBandwidth.js';
import { rewritePhotoStudioUrl } from '../../utils/photoStudioUrls.js';
import { downloadPhotoStudioAsset } from '../../utils/photoStudioDownload.js';
import {
  galleryNeedsVariantPolling,
  getGalleryThumbSrc,
  imageNeedsVariantPolling,
  preloadImageSrc,
} from '../../utils/photoStudioProgressive.js';
import PhotoSharingHeader from '../../components/admin/photos/PhotoSharingHeader.jsx';
import MediaStats from '../../components/admin/photos/MediaStats.jsx';
import MediaUploadPanel from '../../components/admin/photos/MediaUploadPanel.jsx';
import MediaToolbar from '../../components/admin/photos/MediaToolbar.jsx';
import MediaDateGroup from '../../components/admin/photos/MediaDateGroup.jsx';
import MediaEmptyState, { MediaLoadingGrid } from '../../components/admin/photos/MediaEmptyState.jsx';
import DeleteMediaModal from '../../components/admin/photos/DeleteMediaModal.jsx';
import ReplacePhotoModal from '../../components/admin/photos/ReplacePhotoModal.jsx';
import AddToAlbumModal from '../../components/admin/photos/AddToAlbumModal.jsx';
import {
  PAGE_SIZE,
  isAcceptedMediaFile,
  isVideoItem,
  getLocalDateKey,
  groupImagesByDay,
  dedupeImages,
  detectNewlyUploadedIds,
  toLightboxPhoto,
  createFilePreviewUrls,
  assignPreviewsByIndex,
  assignPreviewsByFilename,
  resolveLocalPreview,
  extractImagesFromUploadResult,
  waitForGalleryRefresh,
  formatAlbumLabel,
} from '../../components/admin/photos/utils.js';
import '../../styles/photos/photo-sharing.css';
import '../../styles/send-photos.css';

function matchesDateFilter(uploadTime, dateFilter) {
  if (!uploadTime || dateFilter === 'all') return true;
  const d = new Date(uploadTime);
  const now = new Date();
  const key = getLocalDateKey(d);
  const todayKey = getLocalDateKey(now);

  if (dateFilter === 'today') return key === todayKey;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateFilter === 'yesterday') return key === getLocalDateKey(yesterday);

  if (dateFilter === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  }

  if (dateFilter === 'month') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }

  return true;
}

function filterLoadedImages(images, { searchQuery, typeFilter, dateFilter }) {
  const q = searchQuery.trim().toLowerCase();
  return images.filter((img) => {
    if (q && !(img.filename || '').toLowerCase().includes(q)) return false;
    if (typeFilter === 'photos' && isVideoItem(img)) return false;
    if (typeFilter === 'videos' && !isVideoItem(img)) return false;
    if (typeFilter === 'processing' && !imageNeedsVariantPolling(img)) return false;
    if (!matchesDateFilter(img.uploadTime, dateFilter)) return false;
    return true;
  });
}

export default function AdminPhotos() {
  const { toast } = useToast();
  useUploadBandwidth();
  const { user } = useAuth();
  const { tenantPath } = useTenantPath();
  const fileInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const handledUploadIdsRef = useRef(new Set());

  const [config, setConfig] = useState(null);
  const [images, setImages] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [queueState, setQueueState] = useState(() => classroomUploadManager.getState());
  const [isAddingFiles, setIsAddingFiles] = useState(false);
  const [thumbnailUrls, setThumbnailUrls] = useState(() => new Map());
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
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [addToAlbumTarget, setAddToAlbumTarget] = useState(null);
  const [addToAlbumCaption, setAddToAlbumCaption] = useState('');
  const [highlightedIds, setHighlightedIds] = useState(() => new Set());
  const [localPreviews, setLocalPreviews] = useState({});
  const [localPreviewsByFilename, setLocalPreviewsByFilename] = useState({});
  const [showUploadPanel, setShowUploadPanel] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

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
    thumbnailUrls.forEach((url) => URL.revokeObjectURL(url));
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
  const uploadLimits = useMemo(() => normalizeUploadLimits(config), [config]);
  const uploadLimitHint = useMemo(() => getMediaUploadLimitHint(uploadLimits), [uploadLimits]);

  const refreshGallery = useCallback(async ({ silent = false } = {}) => {
    setError('');
    if (silent) setRefreshing(true);
    else setLoading(true);
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
      setRefreshing(false);
    }
  }, [loadPage]);

  useEffect(() => {
    const unsub = classroomUploadManager.subscribe(() => {
      setQueueState(classroomUploadManager.getState());
    });
    return unsub;
  }, []);

  useEffect(() => {
    const onOnline = () => classroomUploadManager.setOnline(true);
    const onOffline = () => classroomUploadManager.setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const adminQueueItems = useMemo(
    () => queueState.items.filter(isAdminQueueItem),
    [queueState.items],
  );

  const adminQueueThumbKey = useMemo(
    () => adminQueueItems.map((i) => `${i.id}:${i.fileKey}`).join('|'),
    [adminQueueItems],
  );

  useEffect(() => {
    setThumbnailUrls((prev) => {
      const next = new Map(prev);
      let changed = false;
      adminQueueItems.forEach((item) => {
        if (next.has(item.id)) return;
        if (item.file) {
          next.set(item.id, URL.createObjectURL(item.file));
          changed = true;
        }
      });
      Array.from(next.keys()).forEach((id) => {
        if (!adminQueueItems.some((i) => i.id === id)) {
          URL.revokeObjectURL(next.get(id));
          next.delete(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [adminQueueThumbKey, adminQueueItems]);

  const pendingQueueItems = useMemo(
    () => adminQueueItems.filter((i) => i.status === 'waiting' || i.status === 'paused'),
    [adminQueueItems],
  );

  const activeQueueItems = useMemo(
    () => adminQueueItems.filter((i) =>
      i.status === 'waiting' || i.status === 'paused' || i.status === 'uploading'),
    [adminQueueItems],
  );

  const isUploading = useMemo(
    () => adminQueueItems.some((i) => i.status === 'uploading'),
    [adminQueueItems],
  );

  const hasActiveBatch = useMemo(
    () => adminQueueItems.some((i) =>
      i.status === 'uploading' || i.status === 'waiting' || i.status === 'paused'),
    [adminQueueItems],
  );

  const completedCount = useMemo(
    () => adminQueueItems.filter((i) => i.status === 'completed').length,
    [adminQueueItems],
  );

  const failedCount = useMemo(
    () => adminQueueItems.filter((i) => i.status === 'failed').length,
    [adminQueueItems],
  );

  const remainingCount = useMemo(
    () => adminQueueItems.filter((i) => i.status !== 'completed').length,
    [adminQueueItems],
  );

  const finishedCount = completedCount + failedCount;

  const overallProgressPct = adminQueueItems.length
    ? Math.round((completedCount / adminQueueItems.length) * 100)
    : 0;

  const revokeThumbnail = useCallback((id) => {
    setThumbnailUrls((prev) => {
      const url = prev.get(id);
      if (!url) return prev;
      URL.revokeObjectURL(url);
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const applyPickedFiles = useCallback(async (fileList) => {
    const accepted = filterAcceptedClassroomMediaFiles(fileList);
    if (accepted.length === 0) {
      toast('Please choose image or video files (MP4, MOV, WebM).', 'warning');
      return;
    }
    if (accepted.length < Array.from(fileList || []).length) {
      toast('Some files were skipped. Use images (JPG, PNG, WebP) or videos (MP4, MOV, WebM).', 'warning');
    }
    const sizeCheck = validateMediaUploadFiles(accepted, uploadLimits);
    if (!sizeCheck.valid) {
      toast(sizeCheck.error, 'error');
      return;
    }

    setIsAddingFiles(true);
    try {
      await probeUploadBandwidth();
      const tuning = getUploadTuning();
      const prepared = await prepareFilesForUpload(sizeCheck.files, {
        quality: tuning.compressionQuality,
        maxWidth: tuning.maxWidth,
        maxHeight: tuning.maxHeight,
        targetMaxBytes: tuning.targetMaxBytes,
      });
      const { added, skipped, skippedDueToLimit } = await classroomUploadManager.addFiles(prepared, {
        originEndpoint: UPLOAD_ENDPOINT.ADMIN,
      });
      if (added) {
        toast(`${added} file${added === 1 ? '' : 's'} added to upload queue`, 'success');
        setShowUploadPanel(true);
      }
      if (skipped) toast(`${skipped} file${skipped === 1 ? '' : 's'} already in queue`, 'warning');
      if (skippedDueToLimit) {
        toast(`Queue limit (${MAX_UPLOAD_QUEUE}) reached — ${skippedDueToLimit} file(s) not added`, 'error');
      }
    } finally {
      setIsAddingFiles(false);
    }
  }, [toast, uploadLimits]);

  const handleGalleryUploadComplete = useCallback(async (item) => {
    const uploadResult = item.uploadResult;
    const filePreviews = createFilePreviewUrls([item.file]);
    const previewsByFilename = {};
    if (filePreviews[0]) previewsByFilename[item.file.name.toLowerCase()] = filePreviews[0];
    setLocalPreviewsByFilename((prev) => ({ ...prev, ...previewsByFilename }));

    const uploadedImages = extractImagesFromUploadResult(uploadResult);
    if (uploadedImages.length > 0) {
      setImages((prev) => dedupeImages([...uploadedImages, ...prev]));
    }

    const beforeIds = new Set(images.map((img) => String(img.id)));
    try {
      const { batch } = await waitForGalleryRefresh(loadPage, beforeIds, uploadResult, [item.file]);
      const newIds = detectNewlyUploadedIds(beforeIds, batch, [item.file], uploadResult);
      const previewsById = {
        ...assignPreviewsByIndex(filePreviews, newIds),
        ...assignPreviewsByFilename([item.file], filePreviews, batch),
      };
      markHighlighted(newIds);
      setLocalPreviews((prev) => ({ ...prev, ...previewsById }));
    } catch {
      // gallery refresh is best-effort
    }
  }, [images, loadPage, markHighlighted]);

  useEffect(() => {
    queueState.items.forEach((item) => {
      if (item.status !== 'completed' || handledUploadIdsRef.current.has(item.id)) return;
      if (item.uploadParams?.endpoint !== UPLOAD_ENDPOINT.ADMIN) return;
      handledUploadIdsRef.current.add(item.id);
      void handleGalleryUploadComplete(item);
    });
  }, [queueState.items, handleGalleryUploadComplete]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const filteredImages = useMemo(
    () => filterLoadedImages(sortedImages, { searchQuery, typeFilter, dateFilter }),
    [sortedImages, searchQuery, typeFilter, dateFilter],
  );

  const needsVariantPolling = useMemo(() => {
    if (lightboxIndex < 0) return false;
    const active = filteredImages[lightboxIndex];
    return !!active && imageNeedsVariantPolling(active);
  }, [lightboxIndex, filteredImages]);

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

    const activeId = filteredImages[lightboxIndex]?.id;

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
  }, [needsVariantPolling, photosReady, lightboxIndex, filteredImages]);

  const imageGroups = useMemo(() => groupImagesByDay(filteredImages), [filteredImages]);
  const lightboxPhotos = useMemo(() => filteredImages.map(toLightboxPhoto), [filteredImages]);
  const lightboxPhoto = lightboxIndex >= 0 ? lightboxPhotos[lightboxIndex] : null;
  const hasMore = page + 1 < totalPages;

  const photoCount = useMemo(
    () => sortedImages.filter((img) => !isVideoItem(img)).length,
    [sortedImages],
  );
  const videoCount = useMemo(
    () => sortedImages.filter(isVideoItem).length,
    [sortedImages],
  );

  const selectedAlbum = useMemo(
    () => albums.find((album) => album.id === selectedAlbumId) || null,
    [albums, selectedAlbumId],
  );

  const buildUploadParams = useCallback(() => ({
    endpoint: UPLOAD_ENDPOINT.ADMIN,
    albumId: selectedAlbumId,
    classId: selectedAlbum?.classId || null,
    className: selectedAlbum?.className || selectedAlbum?.albumName || null,
    schoolId: user?.schoolId || null,
    schoolName: user?.schoolName || null,
    uploadTarget: selectedAlbum?.classId ? UPLOAD_TARGETS.CLASS_ALBUM : null,
    caption: uploadCaption.trim() || undefined,
  }), [selectedAlbum, selectedAlbumId, uploadCaption, user?.schoolId, user?.schoolName]);

  const batchSuccessShownRef = useRef(false);

  useEffect(() => {
    const hasWaiting = adminQueueItems.some(
      (i) => i.status === 'waiting' || i.status === 'uploading' || i.status === 'paused',
    );
    const allDone = adminQueueItems.length > 0
      && adminQueueItems.every((i) => i.status === 'completed' || i.status === 'failed');
    if (hasWaiting || !allDone) {
      batchSuccessShownRef.current = false;
      return;
    }
    if (batchSuccessShownRef.current) return;

    const adminCompleted = adminQueueItems.filter((i) => i.status === 'completed').length;
    const adminFailed = adminQueueItems.filter((i) => i.status === 'failed').length;

    if (adminCompleted > 0 && adminFailed === 0) {
      batchSuccessShownRef.current = true;
      const albumLabel = formatAlbumLabel(selectedAlbum);
      toast(
        adminCompleted === 1
          ? `Added to ${albumLabel}.`
          : `${adminCompleted} files added to ${albumLabel}.`,
        'success',
      );
    } else if (adminFailed > 0 && adminCompleted === 0) {
      batchSuccessShownRef.current = true;
      toast('Upload failed. Check the queue for details.', 'error');
    }
  }, [completedCount, failedCount, adminQueueItems, selectedAlbum, toast]);

  const handleStartUpload = useCallback(async () => {
    if (!photosReady) {
      toast('Photo storage is not connected for this workspace yet.', 'warning');
      return;
    }
    if (!selectedAlbumId) {
      toast('Choose a class album before uploading.', 'warning');
      return;
    }
    if (pendingQueueItems.length === 0) {
      toast('Add at least one file to the queue.', 'warning');
      return;
    }

    batchSuccessShownRef.current = false;
    try {
      const count = await classroomUploadManager.submitPending(buildUploadParams(), {
        scopeEndpoint: UPLOAD_ENDPOINT.ADMIN,
      });
      if (count === 0) {
        toast('No files waiting to upload.', 'warning');
      }
    } catch (err) {
      toast(resolveMediaUploadError(err, uploadLimits), 'error');
    }
  }, [buildUploadParams, pendingQueueItems.length, photosReady, selectedAlbumId, toast, uploadLimits]);

  const cancelUpload = useCallback(async (id) => {
    revokeThumbnail(id);
    await classroomUploadManager.cancel(id);
    toast('Upload cancelled.', 'warning');
  }, [revokeThumbnail, toast]);

  const cancelAllUploads = useCallback(async () => {
    const activeIds = adminQueueItems
      .filter((i) => i.status === 'uploading' || i.status === 'waiting' || i.status === 'paused')
      .map((i) => i.id);
    activeIds.forEach((id) => revokeThumbnail(id));
    await classroomUploadManager.cancelAllActive({ scopeEndpoint: UPLOAD_ENDPOINT.ADMIN });
    toast('All uploads cancelled.', 'warning');
  }, [adminQueueItems, revokeThumbnail, toast]);

  const removeFromQueue = useCallback(async (id) => {
    revokeThumbnail(id);
    await classroomUploadManager.remove(id);
  }, [revokeThumbnail]);

  const retryUpload = useCallback(async (id) => {
    await classroomUploadManager.retry(id);
  }, []);

  const handleClearFinished = useCallback(async () => {
    const removedIds = await classroomUploadManager.clearFinished({
      scopeEndpoint: UPLOAD_ENDPOINT.ADMIN,
    });
    removedIds.forEach((id) => revokeThumbnail(id));
  }, [revokeThumbnail]);

  const openLightbox = useCallback((image) => {
    const idx = filteredImages.findIndex((img) => img.id === image.id);
    if (idx >= 0) setLightboxIndex(idx);
  }, [filteredImages]);

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

  const handleAddExistingToAlbum = async (image, { albumId, caption } = {}) => {
    const targetAlbumId = albumId || selectedAlbumId;
    if (!targetAlbumId || !image?.id) {
      setAddToAlbumTarget(image);
      setAddToAlbumCaption(uploadCaption.trim() || image?.filename || '');
      return;
    }
    setLinkingId(image.id);
    try {
      await linkExistingToAlbum({
        albumId: targetAlbumId,
        externalAssetIds: [String(image.id)],
        caption: caption || uploadCaption.trim() || image.filename,
      });
      const album = albums.find((a) => a.id === targetAlbumId);
      const albumLabel = formatAlbumLabel(album);
      toast(`Added to ${albumLabel}.`, 'success');
      markHighlighted([String(image.id)]);
      setAddToAlbumTarget(null);
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
    setReplaceModalOpen(true);
  };

  const handleReplaceChooseFile = () => {
    replaceInputRef.current?.click();
  };

  const handleReplaceFile = async (fileList) => {
    const image = replaceTarget;
    const file = Array.from(fileList || []).find(isAcceptedMediaFile);
    if (!image?.id || !file) {
      setReplaceTarget(null);
      setReplaceModalOpen(false);
      return;
    }
    const sizeCheck = validateMediaUploadFile(file, uploadLimits);
    if (!sizeCheck.valid) {
      toast(sizeCheck.error, 'error');
      setReplaceTarget(null);
      setReplaceModalOpen(false);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
      return;
    }
    if (isVideoItem(image)) {
      toast('Replace is only available for photos.', 'warning');
      setReplaceTarget(null);
      setReplaceModalOpen(false);
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
      toast(resolveMediaUploadError(err, uploadLimits), 'error');
    } finally {
      setReplacingId(null);
      setReplaceTarget(null);
      setReplaceModalOpen(false);
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
    void applyPickedFiles(e.dataTransfer.files);
  };

  const hasActiveFilters = searchQuery.trim() || typeFilter !== 'all' || dateFilter !== 'all';
  const showEmptyLibrary = photosReady && sortedImages.length === 0 && !error && !loading;
  const showNoResults = photosReady && sortedImages.length > 0 && filteredImages.length === 0 && !error;
  const showGallery = photosReady && !error && filteredImages.length > 0;

  return (
    <DashboardLayout>
      <div className="photo-sharing-page admin-photos-page">
        <PhotoSharingHeader
          tenantPath={tenantPath}
          photosReady={photosReady}
          loading={loading}
          refreshing={refreshing}
          config={config}
          showUploadPanel={showUploadPanel}
          onToggleUpload={() => setShowUploadPanel((v) => !v)}
          onRefresh={() => refreshGallery({ silent: photosReady })}
        />

        {photosReady && !loading && (
          <MediaStats
            totalLoaded={sortedImages.length}
            albumCount={albums.length}
            photoCount={photoCount}
            videoCount={videoCount}
          />
        )}

        {photosReady && (
          <>
            <div className="admin-photos-upload-status" aria-live="polite">
              {queueState.isOnline ? (
                <span className="send-photos-online-badge">
                  <Wifi size={14} aria-hidden />
                  Online
                </span>
              ) : (
                <span className="send-photos-online-badge">
                  <WifiOff size={14} aria-hidden />
                  Offline — uploads paused
                </span>
              )}
            </div>
            <MediaUploadPanel
              visible={showUploadPanel}
              albums={albums}
              selectedAlbumId={selectedAlbumId}
              onAlbumChange={setSelectedAlbumId}
              uploadCaption={uploadCaption}
              onCaptionChange={setUploadCaption}
              uploadLimitHint={`${uploadLimitHint} · photos auto-compress · large videos upload at network speed`}
              uploading={isUploading}
              uploadProgress={overallProgressPct}
              dragOver={dragOver}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              queueCount={activeQueueItems.length}
              queueItems={activeQueueItems}
              queuePreviewUrls={thumbnailUrls}
              isAddingFiles={isAddingFiles}
              onChooseFiles={() => fileInputRef.current?.click()}
              onUpload={() => { void handleStartUpload(); }}
              onFileInputChange={(e) => {
                void applyPickedFiles(e.target.files);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              fileInputRef={fileInputRef}
              replaceInputRef={replaceInputRef}
              onReplaceFileChange={(e) => handleReplaceFile(e.target.files)}
            />
            <ClassroomUploadQueuePanel
              items={adminQueueItems}
              thumbnailUrls={thumbnailUrls}
              hasActiveBatch={hasActiveBatch}
              remainingCount={remainingCount}
              finishedCount={finishedCount}
              onCancel={cancelUpload}
              onCancelAll={cancelAllUploads}
              onRemove={removeFromQueue}
              onRetry={retryUpload}
                onClearFinished={() => { void handleClearFinished(); }}
              className="send-photos-card send-photos-queue admin-photos-queue"
            />
          </>
        )}

        {error && (
          <div className="photo-sharing-error" role="alert">
            <p>{error}</p>
            <Button type="button" variant="secondary" onClick={() => refreshGallery()}>
              <RefreshCw size={16} aria-hidden />
              Retry
            </Button>
          </div>
        )}

        {photosReady && !loading && sortedImages.length > 0 && (
          <MediaToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onRefresh={() => refreshGallery({ silent: true })}
            refreshing={refreshing}
            resultCount={filteredImages.length}
            totalLoaded={sortedImages.length}
            hasMore={hasMore}
          />
        )}

        {loading ? (
          <MediaLoadingGrid count={10} viewMode={viewMode} />
        ) : showEmptyLibrary ? (
          <MediaEmptyState
            variant="empty"
            onUploadClick={() => setShowUploadPanel(true)}
          />
        ) : showNoResults ? (
          <MediaEmptyState variant="no-results" hasFilters={hasActiveFilters} />
        ) : showGallery ? (
          <>
            {imageGroups.map((group) => (
              <MediaDateGroup
                key={group.dateKey}
                group={group}
                viewMode={viewMode}
                localPreviews={localPreviews}
                localPreviewsByFilename={localPreviewsByFilename}
                resolveLocalPreview={resolveLocalPreview}
                onOpen={openLightbox}
                onDelete={setDeleteTarget}
                onDownload={handleDownloadImage}
                onReplace={handleReplaceClick}
                onAddToAlbum={handleAddExistingToAlbum}
                canAddToAlbum={Boolean(selectedAlbumId)}
                linkingId={linkingId}
                downloadingId={downloadingId}
                replacingId={replacingId}
                highlightedIds={highlightedIds}
              />
            ))}

            {hasMore && (
              <div className="photo-sharing-load-more">
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
        ) : null}
      </div>

      <PhotoLightbox
        photo={lightboxPhoto}
        onClose={() => setLightboxIndex(-1)}
        onPrev={() => setLightboxIndex((i) => (i > 0 ? i - 1 : i))}
        onNext={() => setLightboxIndex((i) => (i < lightboxPhotos.length - 1 ? i + 1 : i))}
        hasPrev={lightboxIndex > 0}
        hasNext={lightboxIndex >= 0 && lightboxIndex < lightboxPhotos.length - 1}
        positionLabel={lightboxIndex >= 0 ? `${lightboxIndex + 1} of ${lightboxPhotos.length}` : ''}
      />

      <DeleteMediaModal
        open={!!deleteTarget}
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
      />

      <ReplacePhotoModal
        open={replaceModalOpen}
        target={replaceTarget}
        onClose={() => {
          setReplaceModalOpen(false);
          setReplaceTarget(null);
        }}
        onChooseFile={handleReplaceChooseFile}
        loading={Boolean(replacingId)}
        uploadLimitHint={uploadLimitHint}
      />

      <AddToAlbumModal
        open={!!addToAlbumTarget}
        image={addToAlbumTarget}
        albums={albums}
        selectedAlbumId={selectedAlbumId}
        onAlbumChange={setSelectedAlbumId}
        caption={addToAlbumCaption}
        onCaptionChange={setAddToAlbumCaption}
        onConfirm={() => handleAddExistingToAlbum(addToAlbumTarget, {
          albumId: selectedAlbumId,
          caption: addToAlbumCaption,
        })}
        loading={Boolean(linkingId)}
        onClose={() => setAddToAlbumTarget(null)}
      />
    </DashboardLayout>
  );
}
