import { rewritePhotoStudioUrl } from './photoStudioUrls.js';

/** Redact auth tokens from URLs for safe logging. */
export function redactMediaUrl(url) {
  if (!url || typeof url !== 'string') return url || '';
  return url.replace(/([?&]token=)[^&]+/gi, '$1[REDACTED]');
}

function isThumbnailUrl(url) {
  return typeof url === 'string' && /\/thumbnail(\?|$)/i.test(url);
}

function isPlayableStreamUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (isThumbnailUrl(url)) return false;
  return /\/stream\/master\.m3u8/i.test(url)
    || /\.m3u8(\?|$)/i.test(url)
    || /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

function isDownloadableVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) && !/\.m3u8(\?|$)/i.test(url);
}

/** Normalize a quality label to stable lowercase form (240p, source, etc.). */
export function normalizeQualityLabel(label) {
  if (label == null || label === '') return '';
  const trimmed = String(label).trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'source' || lower === 'original') return 'source';
  const match = lower.match(/^(\d+)p?$/);
  if (match) return `${match[1]}p`;
  const pMatch = lower.match(/^(\d+)p$/);
  if (pMatch) return `${pMatch[1]}p`;
  return lower;
}

/** Stable key for quality selector values and level matching. */
export function normalizeQualityKey(label, isSource = false) {
  if (isSource) return 'source';
  const normalized = normalizeQualityLabel(label);
  if (normalized === 'source') return 'source';
  const num = parseInt(normalized.replace(/p$/i, ''), 10);
  return Number.isNaN(num) ? normalized : String(num);
}

export function isReadyRenditionStatus(status) {
  if (status == null || status === '') return true;
  const upper = String(status).toUpperCase();
  return upper === 'READY' || upper === 'ACTIVE';
}

function normalizeRendition(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const label = normalizeQualityLabel(raw.label);
  const isSource = raw.isSource === true || label === 'source';
  const streamUrlRaw = raw.streamUrl || raw.url || raw.playbackUrl;
  if (!streamUrlRaw || typeof streamUrlRaw !== 'string') return null;

  const streamUrl = rewritePhotoStudioUrl(streamUrlRaw);
  if (!streamUrl || isThumbnailUrl(streamUrl)) return null;

  return {
    label: isSource ? 'source' : (label || (raw.height ? `${raw.height}p` : '')),
    displayLabel: isSource ? 'Source' : (label || (raw.height ? `${raw.height}p` : 'Unknown')),
    qualityKey: normalizeQualityKey(raw.label, isSource),
    width: typeof raw.width === 'number' ? raw.width : undefined,
    height: typeof raw.height === 'number' ? raw.height : undefined,
    bitrateKbps: typeof raw.bitrateKbps === 'number'
      ? raw.bitrateKbps
      : (typeof raw.bitrate === 'number' ? Math.round(raw.bitrate / 1000) : undefined),
    status: raw.status,
    streamUrl,
    isSource,
  };
}

export function isPlayableReadyRendition(rendition) {
  if (!rendition?.streamUrl) return false;
  if (!isPlayableStreamUrl(rendition.streamUrl)) return false;
  return isReadyRenditionStatus(rendition.status);
}

function renditionCompletenessScore(r) {
  let score = 0;
  if (r.streamUrl) score += 4;
  if (r.height) score += 2;
  if (r.width) score += 1;
  if (r.bitrateKbps) score += 1;
  if (r.label) score += 1;
  return score;
}

function dedupeKey(rendition) {
  const label = normalizeQualityLabel(rendition.label);
  const height = rendition.height || 0;
  const width = rendition.width || 0;
  if (label === 'source') return 'source';
  return `${label}:${height}:${width}`;
}

export function compareVideoQualities(a, b) {
  const aSource = a.isSource || normalizeQualityLabel(a.label) === 'source';
  const bSource = b.isSource || normalizeQualityLabel(b.label) === 'source';
  if (aSource && !bSource) return 1;
  if (!aSource && bSource) return -1;

  const heightDiff = (a.height || 0) - (b.height || 0);
  if (heightDiff !== 0) return heightDiff;

  const widthDiff = (a.width || 0) - (b.width || 0);
  if (widthDiff !== 0) return widthDiff;

  return String(a.label || '').localeCompare(String(b.label || ''));
}

export function deduplicateRenditions(renditions) {
  const byKey = new Map();

  renditions.forEach((rendition) => {
    const key = dedupeKey(rendition);
    const existing = byKey.get(key);
    if (!existing || renditionCompletenessScore(rendition) > renditionCompletenessScore(existing)) {
      byKey.set(key, rendition);
    }
  });

  return Array.from(byKey.values());
}

export function normalizeVideoRenditions(item) {
  const candidates = [
    ...(Array.isArray(item?.renditions) ? item.renditions : []),
    ...(Array.isArray(item?.variants?.qualities) ? item.variants.qualities : []),
  ];

  return deduplicateRenditions(
    candidates
      .map(normalizeRendition)
      .filter(Boolean)
      .filter(isPlayableReadyRendition),
  ).sort(compareVideoQualities);
}

function resolveMasterStreamUrl(item, renditions) {
  const candidates = [
    item?.hlsUrl,
    item?.streamUrl,
    item?.playbackUrl,
    item?.previewUrl,
    item?.downloadUrl,
  ];

  // Prefer adaptive master playlists over single-ladder /720p/index.m3u8.
  const rewritten = candidates
    .filter((url) => typeof url === 'string' && url && !isThumbnailUrl(url) && isPlayableStreamUrl(url))
    .map((url) => rewritePhotoStudioUrl(url));

  const master = rewritten.find((url) => /\/stream\/master\.m3u8|\bmaster\.m3u8\b/i.test(url));
  if (master) return master;

  if (rewritten[0]) return rewritten[0];

  const firstRendition = renditions.find((r) => r.streamUrl);
  return firstRendition?.streamUrl || null;
}

function resolveDownloadUrl(item, renditions) {
  const candidates = [
    item?.originalUrl,
    item?.sourceUrl,
    item?.downloadUrl,
    ...renditions.filter((r) => r.isSource).map((r) => r.streamUrl),
  ];

  for (const url of candidates) {
    if (typeof url !== 'string' || !url) continue;
    if (isDownloadableVideoUrl(url)) {
      return rewritePhotoStudioUrl(url);
    }
  }

  const nonHls = [item?.downloadUrl, item?.previewUrl].find(
    (url) => typeof url === 'string' && url && isDownloadableVideoUrl(url),
  );
  return nonHls ? rewritePhotoStudioUrl(nonHls) : null;
}

/** Source rendition, else largest pixel area — for layout aspect ratio only (not stream quality). */
export function resolveLayoutRendition(renditions = [], item = null) {
  const source = renditions.find((r) => r.isSource);
  if (source?.width && source?.height) return source;

  let best = null;
  let bestPixels = 0;
  renditions.forEach((rendition) => {
    const width = rendition.width || 0;
    const height = rendition.height || 0;
    const pixels = width * height;
    if (pixels > bestPixels) {
      bestPixels = pixels;
      best = rendition;
    }
  });
  if (best?.width && best?.height) return best;

  const width = item?.width;
  const height = item?.height;
  if (width && height) return { width, height };
  return null;
}

function computeAspectRatio(renditions, item) {
  const layout = resolveLayoutRendition(renditions, item);
  if (layout?.width && layout?.height) return `${layout.width} / ${layout.height}`;
  return undefined;
}

/**
 * Single normalization entry point for video media items from the Photo Studio API.
 */
export function normalizeVideoMediaItem(item) {
  if (!item || item.mediaType !== 'VIDEO') return null;

  const renditions = normalizeVideoRenditions(item);
  const masterStreamUrl = resolveMasterStreamUrl(item, renditions);
  const downloadUrl = resolveDownloadUrl(item, renditions);

  return {
    id: item.id,
    mediaType: 'VIDEO',
    filename: item.filename,
    thumbnailUrl: item.thumbnailUrl ? rewritePhotoStudioUrl(item.thumbnailUrl) : undefined,
    masterStreamUrl,
    streamUrl: masterStreamUrl,
    downloadUrl,
    processingStatus: item.processingStatus || item.status,
    videoId: item.videoId,
    defaultQuality: item.variants?.defaultQuality
      ? normalizeQualityLabel(item.variants.defaultQuality)
      : undefined,
    maxQuality: item.variants?.maxQuality
      ? normalizeQualityLabel(item.variants.maxQuality)
      : undefined,
    renditions,
    aspectRatio: computeAspectRatio(renditions, item),
    variants: item.variants,
  };
}

/** Human-readable quality label for selector and badge. */
export function formatVideoQualityLabel(rendition, { detailed = false } = {}) {
  if (!rendition) return '';
  const isSource = rendition.isSource || normalizeQualityLabel(rendition.label) === 'source';
  if (isSource) {
    if (detailed && rendition.width && rendition.height) {
      return `Source · ${rendition.width} × ${rendition.height}`;
    }
    return 'Source';
  }
  const label = normalizeQualityLabel(rendition.label) || (rendition.height ? `${rendition.height}p` : '');
  return label || 'Unknown';
}

/** Optional bitrate suffix for quality selector options. */
export function formatQualityBitrateLabel(rendition) {
  if (!rendition) return '';
  if (rendition.isSource || normalizeQualityLabel(rendition.label) === 'source') {
    return 'Original';
  }
  if (!rendition.bitrateKbps) return '';
  if (rendition.bitrateKbps >= 1000) {
    const mbps = rendition.bitrateKbps / 1000;
    return `${mbps % 1 === 0 ? mbps : mbps.toFixed(1)} Mbps`;
  }
  return `${rendition.bitrateKbps} kbps`;
}
