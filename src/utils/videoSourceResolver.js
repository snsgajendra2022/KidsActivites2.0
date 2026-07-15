import { rewritePhotoStudioUrl } from './photoStudioUrls.js';
import {
  isPlayableReadyRendition,
  normalizeQualityLabel,
  normalizeVideoRenditions,
  redactMediaUrl,
} from './videoMediaNormalize.js';

/**
 * Progressive web video sources:
 * - HLS (adaptive) kept separate
 * - MP4 / progressive ladders sorted low → high:
 *   240p → 360p → 480p → 720p → 1080p → original
 */

const DEV = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

/** Strict upgrade order (lowest → highest). */
export const PROGRESSIVE_QUALITY_ORDER = [
  '240p',
  '360p',
  '480p',
  '720p',
  '1080p',
  'original',
];

const PROGRESSIVE_RANK = Object.fromEntries(
  PROGRESSIVE_QUALITY_ORDER.map((q, i) => [q, i]),
);

export function isHlsUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return lower.includes('.m3u8') || lower.includes('/stream/master');
}

export function isProgressiveVideoUrl(url) {
  return typeof url === 'string' && /\.(mp4|m4v|mov|webm)(\?|$)/i.test(url);
}

export function isThumbnailUrl(url) {
  return typeof url === 'string' && /\/thumbnail(\?|$)/i.test(url);
}

export function isPlayableVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (isThumbnailUrl(url)) return false;
  return isHlsUrl(url) || isProgressiveVideoUrl(url) || /\/stream\//i.test(url);
}

export function isMasterHlsUrl(url) {
  return typeof url === 'string' && /\/stream\/master\.m3u8|\bmaster\.m3u8\b/i.test(url);
}

function detectType(url) {
  if (isHlsUrl(url)) return 'hls';
  if (isProgressiveVideoUrl(url)) return 'mp4';
  return 'unknown';
}

function statusReady(status) {
  if (status == null || status === '') return true;
  const upper = String(status).toUpperCase();
  return upper === 'READY' || upper === 'ACTIVE' || upper === 'COMPLETE';
}

/**
 * Map raw labels / URLs onto the progressive ladder.
 * HLS singles (…/480p/index.m3u8) map to that height for progressive fallback lists.
 */
export function normalizeProgressiveQuality(raw, url) {
  if (url && isMasterHlsUrl(url)) return 'adaptive';

  const fromUrl = typeof url === 'string'
    ? (url.match(/\/(\d{3,4})p\//i) || url.match(/[?&]quality=(\d{3,4}p?)/i))
    : null;
  if (fromUrl) {
    const q = fromUrl[1].toLowerCase();
    return q.endsWith('p') ? q : `${q}p`;
  }

  if (raw == null || raw === '') {
    if (url && isHlsUrl(url)) return 'hls';
    return 'unknown';
  }

  const label = normalizeQualityLabel(raw);
  if (label === 'source' || label === 'original') return 'original';
  if (label === 'preview' || label === 'playback') return 'preview';
  if (PROGRESSIVE_RANK[label] != null) return label;

  const num = parseInt(String(label).replace(/p$/i, ''), 10);
  if (!Number.isNaN(num)) {
    if (num <= 240) return '240p';
    if (num <= 360) return '360p';
    if (num <= 480) return '480p';
    if (num <= 720) return '720p';
    if (num <= 1080) return '1080p';
    return 'original';
  }
  return label || 'unknown';
}

function progressiveSortIndex(quality) {
  if (quality === 'preview') return -0.5; // before 240 if somehow used as starter
  if (PROGRESSIVE_RANK[quality] != null) return PROGRESSIVE_RANK[quality];
  if (quality === 'hls' || quality === 'adaptive') return -1;
  return PROGRESSIVE_QUALITY_ORDER.length + 1;
}

function pushCandidate(list, seen, url, qualityHint) {
  if (typeof url !== 'string' || !url || seen.has(url)) return;
  if (!isPlayableVideoUrl(url)) return;
  const rewritten = rewritePhotoStudioUrl(url);
  if (!rewritten || seen.has(rewritten) || isThumbnailUrl(rewritten)) return;
  seen.add(url);
  seen.add(rewritten);
  list.push({
    url: rewritten,
    type: detectType(rewritten),
    quality: normalizeProgressiveQuality(qualityHint, rewritten),
  });
}

function collectFromArray(list, seen, arr) {
  if (!Array.isArray(arr)) return;
  arr.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    if (!statusReady(entry.status ?? entry.processingStatus)) return;
    const label = entry.label ?? entry.quality ?? entry.name ?? '';
    pushCandidate(
      list,
      seen,
      entry.streamUrl ?? entry.url ?? entry.playbackUrl ?? entry.previewUrl ?? entry.downloadUrl,
      label,
    );
  });
}

function collectNamedVariantMap(list, seen, variants) {
  if (!variants || typeof variants !== 'object' || Array.isArray(variants)) return;
  [...PROGRESSIVE_QUALITY_ORDER, 'hls', 'preview', 'source'].forEach((key) => {
    const value = variants[key];
    if (typeof value === 'string') {
      pushCandidate(list, seen, value, key);
    } else if (value && typeof value === 'object') {
      if (!statusReady(value.status ?? value.processingStatus)) return;
      pushCandidate(list, seen, value.streamUrl ?? value.url ?? value.playbackUrl, key);
    }
  });
}

function collectAllCandidates(media) {
  const candidates = [];
  const seen = new Set();

  pushCandidate(candidates, seen, media.hlsUrl, 'adaptive');
  pushCandidate(candidates, seen, media.streamUrl, isHlsUrl(media.streamUrl) ? 'hls' : 'playback');
  pushCandidate(candidates, seen, media.playbackUrl, 'playback');

  const variants = media.variants;
  if (variants && typeof variants === 'object') {
    collectFromArray(candidates, seen, variants.qualities);
    collectFromArray(candidates, seen, variants.renditions);
    collectNamedVariantMap(candidates, seen, variants);
  }

  collectFromArray(candidates, seen, media.renditions);
  collectFromArray(candidates, seen, media.videoVariants);
  collectFromArray(candidates, seen, media.sources);
  collectFromArray(candidates, seen, media.files);
  collectFromArray(candidates, seen, media.urls);
  collectFromArray(candidates, seen, media.qualities);

  try {
    normalizeVideoRenditions(media).filter(isPlayableReadyRendition).forEach((r) => {
      pushCandidate(candidates, seen, r.streamUrl, r.label || (r.height ? `${r.height}p` : ''));
    });
  } catch {
    // ignore
  }

  pushCandidate(candidates, seen, media.previewUrl, 'preview');
  pushCandidate(candidates, seen, media.downloadUrl, 'original');
  pushCandidate(candidates, seen, media.originalUrl, 'original');
  pushCandidate(candidates, seen, media.sourceUrl, 'original');
  pushCandidate(candidates, seen, media.url, 'unknown');

  return candidates;
}

function resolvePosterUrl(media) {
  const candidates = [
    media?.thumbnailUrl,
    media?.posterUrl,
    media?.imageUrl,
  ];
  for (const url of candidates) {
    if (typeof url === 'string' && url) return rewritePhotoStudioUrl(url);
  }
  return null;
}

/**
 * Deduplicate progressive ladder: one URL per quality bucket, lowest→highest.
 * Prefers non-HLS progressive files when both exist for the same quality.
 */
function buildProgressiveLadder(candidates) {
  const byQuality = new Map();

  candidates.forEach((c) => {
    let quality = c.quality;
    if (quality === 'source') quality = 'original';
    if (quality === 'preview') {
      // preview acts as early starter when no 240/360 ladder entry
      quality = '240p';
    }
    if (quality === 'playback' || quality === 'unknown') {
      if (c.type === 'hls') return;
      quality = 'original';
    }
    if (quality === 'hls' || quality === 'adaptive') return;
    if (PROGRESSIVE_RANK[quality] == null) return;

    const existing = byQuality.get(quality);
    if (!existing) {
      byQuality.set(quality, { ...c, quality });
      return;
    }
    // Prefer real MP4 over single-ladder HLS for progressive switching
    if (existing.type === 'hls' && c.type !== 'hls') {
      byQuality.set(quality, { ...c, quality });
    }
  });

  return PROGRESSIVE_QUALITY_ORDER
    .filter((q) => byQuality.has(q))
    .map((q) => byQuality.get(q));
}

function pickHlsSource(candidates) {
  // Prefer adaptive master playlists; otherwise any .m3u8 stream URL.
  const master = candidates.find((c) => c.type === 'hls' && isMasterHlsUrl(c.url));
  if (master) return { ...master, quality: 'adaptive', type: 'hls' };
  const anyHls = candidates.find((c) => c.type === 'hls' && isHlsUrl(c.url));
  if (anyHls) return { ...anyHls, quality: 'adaptive', type: 'hls' };
  return null;
}

/**
 * Primary API for progressive quality playback.
 * @returns {{
 *   posterUrl: string|null,
 *   hls: {url:string,type:string,quality:string}|null,
 *   progressive: Array<{url:string,type:string,quality:string}>,
 *   sources: Array<{url:string,type:string,quality:string}>,
 *   ready: boolean
 * }}
 */
export function getProgressiveVideoSources(media) {
  if (!media || typeof media !== 'object') {
    return {
      posterUrl: null,
      hls: null,
      hlsSource: null,
      progressive: [],
      progressiveSources: [],
      sources: [],
      ready: false,
    };
  }

  const candidates = collectAllCandidates(media);
  const hls = pickHlsSource(candidates);
  const progressive = buildProgressiveLadder(candidates);
  const posterUrl = resolvePosterUrl(media);

  // Playback start order for non-HLS fallback: lowest first → original last
  const sources = [
    ...(hls ? [hls] : []),
    ...progressive,
  ];

  if (DEV) {
    console.debug('[videoSourceResolver] progressive', {
      id: media.id,
      hls: hls ? redactMediaUrl(hls.url) : null,
      progressive: progressive.map((s) => ({
        quality: s.quality,
        type: s.type,
        url: redactMediaUrl(s.url),
      })),
    });
  }

  return {
    posterUrl,
    hls,
    hlsSource: hls,
    progressive,
    progressiveSources: progressive,
    sources,
    ready: sources.length > 0,
  };
}

/**
 * Compatibility: ordered playable sources (HLS first, then progressive low→high).
 */
export function getBestPlayableVideoSources(media) {
  const result = getProgressiveVideoSources(media);
  return {
    posterUrl: result.posterUrl,
    sources: result.sources,
    ready: result.ready,
  };
}

export function getOrderedPlayableVideoUrls(media) {
  return getBestPlayableVideoSources(media).sources.map((s) => s.url);
}

export function hasPlayableVideoSource(media) {
  return getBestPlayableVideoSources(media).sources.length > 0;
}

/** Lowest progressive source only (for next-media preload). */
export function getLowestProgressiveSource(media) {
  const { progressive, hls } = getProgressiveVideoSources(media);
  if (progressive[0]) return progressive[0];
  return hls;
}

export { progressiveSortIndex };
