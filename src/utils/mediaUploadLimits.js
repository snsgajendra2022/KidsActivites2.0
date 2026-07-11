import { ApiError } from '../services/api/client.js';
import { getMediaUploadLimits } from '../services/mediaService.js';

export const DEFAULT_MAX_IMAGE_MB = 25;
export const DEFAULT_MAX_VIDEO_MB = 128;

export const ACCEPTED_CLASSROOM_MEDIA =
  'image/jpeg,image/png,image/webp,image/*,video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm,.m4v';

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.m4v'];

let cachedLimits = null;
let limitsPromise = null;

export function isVideoMediaFile(file) {
  if (!file) return false;
  if (file.type?.startsWith('video/')) return true;
  const name = (file.name || '').toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function isAcceptedClassroomMediaFile(file) {
  if (!file) return false;
  if (file.type?.startsWith('image/') || file.type?.startsWith('video/')) return true;
  const name = (file.name || '').toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp', ...VIDEO_EXTENSIONS].some((ext) => name.endsWith(ext));
}

export function normalizeUploadLimits(raw) {
  const maxImageMb = Number(raw?.maxImageMb ?? raw?.maxUploadSizeMb) || DEFAULT_MAX_IMAGE_MB;
  const maxVideoMb = Number(raw?.maxVideoMb ?? raw?.maxVideoUploadSizeMb) || DEFAULT_MAX_VIDEO_MB;
  return { maxImageMb, maxVideoMb };
}

export function getMaxUploadMbForFile(file, limits = {}) {
  const normalized = normalizeUploadLimits(limits);
  return isVideoMediaFile(file) ? normalized.maxVideoMb : normalized.maxImageMb;
}

export function formatFileSizeMb(bytes) {
  return `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB`;
}

export function buildFileTooLargeMessage(file, limits = {}) {
  const normalized = normalizeUploadLimits(limits);
  const maxMb = getMaxUploadMbForFile(file, normalized);
  const kind = isVideoMediaFile(file) ? 'Video' : 'Image';
  return `${kind} too large (${formatFileSizeMb(file.size)}). Maximum allowed size is ${maxMb} MB.`;
}

export function validateMediaUploadFile(file, limits = {}) {
  if (!isAcceptedClassroomMediaFile(file)) {
    return {
      valid: false,
      error: 'Unsupported file type. Use images (JPG, PNG, WebP) or videos (MP4, MOV, WebM).',
    };
  }

  const maxMb = getMaxUploadMbForFile(file, limits);
  if (file.size > maxMb * 1024 * 1024) {
    return { valid: false, error: buildFileTooLargeMessage(file, limits) };
  }

  return { valid: true, error: null };
}

export function validateMediaUploadFiles(files, limits = {}) {
  const list = Array.from(files || []);
  for (const file of list) {
    const result = validateMediaUploadFile(file, limits);
    if (!result.valid) return result;
  }
  return { valid: true, error: null, files: list };
}

export function filterAcceptedClassroomMediaFiles(files) {
  return Array.from(files || []).filter(isAcceptedClassroomMediaFile);
}

export function getMediaUploadLimitHint(limits = {}) {
  const normalized = normalizeUploadLimits(limits);
  return `Max ${normalized.maxImageMb} MB per photo · ${normalized.maxVideoMb} MB per video`;
}

export function resolveMediaUploadError(err, limits = {}) {
  const normalized = normalizeUploadLimits(limits);

  if (err instanceof ApiError) {
    if (err.status === 413 || err.code === 'FILE_TOO_LARGE') {
      if (err.message && !/entity too large|request entity too large|payload too large/i.test(err.message)) {
        return err.message;
      }
      return `File is too large. Maximum allowed size is ${normalized.maxVideoMb} MB for videos and ${normalized.maxImageMb} MB for photos.`;
    }
    return err.message || 'Upload failed.';
  }

  const message = err?.message || '';
  if (/entity too large|request entity too large|payload too large|\b413\b/i.test(message)) {
    return `File is too large. Maximum allowed size is ${normalized.maxVideoMb} MB for videos and ${normalized.maxImageMb} MB for photos.`;
  }

  return message || 'Upload failed.';
}

export async function loadMediaUploadLimits({ force = false } = {}) {
  if (cachedLimits && !force) return cachedLimits;
  if (limitsPromise && !force) return limitsPromise;

  limitsPromise = getMediaUploadLimits()
    .then((data) => {
      cachedLimits = normalizeUploadLimits(data);
      return cachedLimits;
    })
    .catch(() => {
      cachedLimits = normalizeUploadLimits(null);
      return cachedLimits;
    })
    .finally(() => {
      limitsPromise = null;
    });

  return limitsPromise;
}
