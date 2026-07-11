import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import Button from '../../components/ui/Button.jsx';
import PhotoLightbox from '../../components/media/PhotoLightbox.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import {
  deletePhotoStudioImage,
  getPhotoStudioConfig,
  listPhotoStudioImages,
  replacePhotoStudioImage,
} from '../../services/photoStudioService.js';
import { listAdminAlbums, uploadAdminAlbumMedia, linkExistingToAlbum, UPLOAD_TARGETS } from '../../services/classAlbumService.js';
import {
  filterAcceptedClassroomMediaFiles,
  getMediaUploadLimitHint,
  normalizeUploadLimits,
  resolveMediaUploadError,
  validateMediaUploadFile,
  validateMediaUploadFiles,
} from '../../utils/mediaUploadLimits.js';
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
  const { user } = useAuth();
  const { tenantPath } = useTenantPath();
  const fileInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const pendingPreviewsRef = useRef([]);

  const [config, setConfig] = useState(null);
  const [images, setImages] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [addToAlbumTarget, setAddToAlbumTarget] = useState(null);
  const [addToAlbumCaption, setAddToAlbumCaption] = useState('');
  const [highlightedIds, setHighlightedIds] = useState(() => new Set());
  const [localPreviews, setLocalPreviews] = useState({});
  const [localPreviewsByFilename, setLocalPreviewsByFilename] = useState({});
  const [showUploadPanel, setShowUploadPanel] = useState(true);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingPreviews, setPendingPreviews] = useState([]);
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
    pendingPreviewsRef.current.forEach((url) => { if (url) URL.revokeObjectURL(url); });
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

  const clearPendingFiles = useCallback(() => {
    pendingPreviewsRef.current.forEach((url) => { if (url) URL.revokeObjectURL(url); });
    pendingPreviewsRef.current = [];
    setPendingFiles([]);
    setPendingPreviews([]);
  }, []);

  const addPendingFiles = useCallback((fileList) => {
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
    const previews = createFilePreviewUrls(sizeCheck.files);
    pendingPreviewsRef.current = [...pendingPreviewsRef.current, ...previews];
    setPendingFiles((prev) => [...prev, ...sizeCheck.files]);
    setPendingPreviews((prev) => [...prev, ...previews]);
    setShowUploadPanel(true);
  }, [toast, uploadLimits]);

  const handleRemovePendingFile = useCallback((file) => {
    setPendingFiles((prev) => {
      const index = prev.indexOf(file);
      if (index < 0) return prev;
      setPendingPreviews((p) => {
        const next = [...p];
        if (next[index]) URL.revokeObjectURL(next[index]);
        next.splice(index, 1);
        pendingPreviewsRef.current = next;
        return next;
      });
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  }, []);

  const handleUploadFiles = async (fileList) => {
    if (!photosReady) {
      toast('Photo storage is not connected for this workspace yet.', 'warning');
      return;
    }
    if (!selectedAlbumId) {
      toast('Choose a class album before uploading.', 'warning');
      return;
    }

    const files = fileList?.length ? Array.from(fileList) : pendingFiles;
    if (!files.length) return;

    const accepted = filterAcceptedClassroomMediaFiles(files);
    const sizeCheck = validateMediaUploadFiles(accepted, uploadLimits);
    if (!sizeCheck.valid) {
      toast(sizeCheck.error, 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    const uploadFiles = sizeCheck.files;
    const filePreviews = createFilePreviewUrls(uploadFiles);
    const previewsByFilename = {};
    uploadFiles.forEach((file, index) => {
      if (filePreviews[index]) previewsByFilename[file.name.toLowerCase()] = filePreviews[index];
    });
    setLocalPreviewsByFilename((prev) => ({ ...prev, ...previewsByFilename }));

    try {
      setUploadProgress(35);
      const beforeIds = new Set(images.map((img) => String(img.id)));
      const uploadResult = await uploadAdminAlbumMedia({
        albumId: selectedAlbumId,
        classId: selectedAlbum?.classId || null,
        className: selectedAlbum?.className || selectedAlbum?.albumName || null,
        schoolId: user?.schoolId || null,
        schoolName: user?.schoolName || null,
        uploadTarget: selectedAlbum?.classId ? UPLOAD_TARGETS.CLASS_ALBUM : null,
        caption: uploadCaption.trim() || undefined,
        files: uploadFiles,
      });
      setUploadProgress(70);

      const uploadedImages = extractImagesFromUploadResult(uploadResult);
      if (uploadedImages.length > 0) {
        setImages((prev) => dedupeImages([...uploadedImages, ...prev]));
      }

      const { batch } = await waitForGalleryRefresh(loadPage, beforeIds, uploadResult, uploadFiles);
      const newIds = detectNewlyUploadedIds(beforeIds, batch, uploadFiles, uploadResult);
      const previewsById = {
        ...assignPreviewsByIndex(filePreviews, newIds),
        ...assignPreviewsByFilename(uploadFiles, filePreviews, batch),
      };

      markHighlighted(newIds);
      setLocalPreviews((prev) => ({ ...prev, ...previewsById }));
      setUploadProgress(100);

      const albumLabel = formatAlbumLabel(selectedAlbum);
      toast(
        uploadFiles.length === 1
          ? `Added to ${albumLabel}.`
          : `${uploadFiles.length} files added to ${albumLabel}.`,
        'success',
      );
      clearPendingFiles();
    } catch (err) {
      toast(resolveMediaUploadError(err, uploadLimits), 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
    addPendingFiles(e.dataTransfer.files);
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
          <MediaUploadPanel
            visible={showUploadPanel}
            albums={albums}
            selectedAlbumId={selectedAlbumId}
            onAlbumChange={setSelectedAlbumId}
            uploadCaption={uploadCaption}
            onCaptionChange={setUploadCaption}
            uploadLimitHint={uploadLimitHint}
            uploading={uploading}
            uploadProgress={uploadProgress}
            dragOver={dragOver}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            pendingFiles={pendingFiles}
            pendingPreviews={pendingPreviews}
            onRemovePendingFile={handleRemovePendingFile}
            onChooseFiles={() => fileInputRef.current?.click()}
            onUpload={() => handleUploadFiles()}
            onFileInputChange={(e) => {
              addPendingFiles(e.target.files);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            fileInputRef={fileInputRef}
            replaceInputRef={replaceInputRef}
            onReplaceFileChange={(e) => handleReplaceFile(e.target.files)}
          />
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
