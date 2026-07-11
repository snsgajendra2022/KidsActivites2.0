import {
  ACCEPTED_CLASSROOM_MEDIA,
  filterAcceptedClassroomMediaFiles,
} from '../../../utils/mediaUploadLimits.js';
import { resolveVideoStreamUrl } from '../../../utils/photoStudioProgressive.js';
import { normalizeVideoMediaItem } from '../../../utils/videoMediaNormalize.js';

export const ACCEPTED_MEDIA = ACCEPTED_CLASSROOM_MEDIA;
export const PAGE_SIZE = 20;

export function isAcceptedMediaFile(file) {
  return filterAcceptedClassroomMediaFiles([file]).length > 0;
}

export function isVideoItem(item) {
  return item?.mediaType === 'VIDEO';
}

export function getLocalDateKey(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatGroupDateLabel(iso) {
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

export function groupImagesByDay(images) {
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

export function dedupeImages(images) {
  const seen = new Set();
  return images.filter((img) => {
    const key = `${img.id}|${img.previewUrl}|${img.uploadTime}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function collectUploadResultIds(response) {
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

export function detectNewlyUploadedIds(beforeIds, batch, uploadedFiles, uploadResult) {
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

export function toLightboxPhoto(img) {
  const isVideo = isVideoItem(img);
  const normalized = isVideo ? normalizeVideoMediaItem(img) : null;
  const streamUrl = normalized?.masterStreamUrl || resolveVideoStreamUrl(img);
  return {
    id: img.id,
    mediaType: img.mediaType || (isVideo ? 'VIDEO' : 'IMAGE'),
    imageUrl: img.previewUrl || img.thumbnailUrl || img.downloadUrl,
    previewUrl: img.previewUrl,
    streamUrl,
    thumbnailUrl: img.thumbnailUrl,
    processingStatus: normalized?.processingStatus || img.processingStatus || img.status,
    videoId: img.videoId,
    renditions: normalized?.renditions ?? img.renditions,
    defaultQuality: normalized?.defaultQuality,
    aspectRatio: normalized?.aspectRatio,
    caption: img.filename,
    teacherName: isVideo ? 'VIDEO' : img.fileType?.toUpperCase(),
    className: img.uploadTime
      ? new Date(img.uploadTime).toLocaleString('en-IN')
      : '',
    variants: img.variants,
    studioImage: isVideo ? null : img,
  };
}

export function isImageFile(file) {
  if (!file) return false;
  if (file.type.startsWith('image/')) return true;
  const name = (file.name || '').toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.heic', '.heif'].some((ext) => name.endsWith(ext));
}

export function createFilePreviewUrls(files) {
  return files.map((file) => (isImageFile(file) ? URL.createObjectURL(file) : null));
}

export function assignPreviewsByIndex(filePreviews, ids) {
  const previews = {};
  ids.forEach((id, index) => {
    const preview = filePreviews[index];
    if (id && preview) previews[String(id)] = preview;
  });
  return previews;
}

export function assignPreviewsByFilename(files, filePreviews, batch) {
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

export function resolveLocalPreview(image, previewsById, previewsByFilename) {
  const byId = previewsById[String(image?.id)];
  if (byId) return byId;
  const name = (image?.filename || '').toLowerCase();
  return name ? previewsByFilename[name] : undefined;
}

export function extractImagesFromUploadResult(uploadResult) {
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

export async function waitForGalleryRefresh(loadPage, beforeIds, uploadResult, files, { attempts = 6 } = {}) {
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

export function formatAlbumLabel(album) {
  if (!album) return '';
  if (album.albumType === 'CUSTOM') return album.albumName;
  return album.className || album.albumName || 'Album';
}

export function formatAlbumOptionLabel(album) {
  const primary = album.albumType === 'CUSTOM' ? album.albumName : (album.className || album.albumName);
  const suffix = album.albumName && album.className && album.albumType !== 'CUSTOM'
    ? ` — ${album.albumName}`
    : '';
  return `${primary}${suffix}`;
}
