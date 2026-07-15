import { rewritePhotoStudioUrl } from './photoStudioUrls.js';
import { normalizeVideoMediaItem } from './videoMediaNormalize.js';
import { getBestPlayableVideoSources } from './videoSourceResolver.js';

/** Progressive quality tiers — s01 (lowest) → s10 (highest). */
export const PHOTO_STUDIO_TIERS = [
  's01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10',
];

/**
 * Build variant URL from a template (preview, thumbnail, or auto URL).
 */
export function buildPhotoStudioVariantUrl(image, tier, templateUrl) {
  if (!image?.id || !tier || !templateUrl) return null;
  try {
    const url = new URL(templateUrl);
    url.pathname = url.pathname.replace(
      /\/(preview|thumbnail|download|variant\/[^/]+)$/,
      `/variant/${tier}`,
    );
    return url.toString();
  } catch {
    return null;
  }
}

export function isThumbnailUrl(url) {
  return typeof url === 'string' && /\/thumbnail(\?|$)/i.test(url);
}

/** First usable display URL — never /thumbnail (those often 404). */
export function firstNonThumbnailUrl(...candidates) {
  for (const url of candidates) {
    if (typeof url !== 'string' || !url) continue;
    if (isThumbnailUrl(url)) continue;
    return url;
  }
  return '';
}

function pickTemplateUrl(image) {
  const v = image?.variants || {};
  const tierS01 = v.tiers?.s01?.url;
  // Never seed variants from /thumbnail — those endpoints commonly 404.
  return firstNonThumbnailUrl(
    typeof v.s01 === 'string' ? v.s01 : null,
    typeof tierS01 === 'string' ? tierS01 : null,
    v.autoUrl,
    v.recommendedUrl,
    v.previewFallbackUrl,
    image?.previewUrl,
    image?.downloadUrl,
    image?.imageUrl,
  ) || null;
}

/**
 * Best playback URL for videos: adaptive HLS master preferred — never thumbnail.
 */
export function resolveVideoStreamUrl(image) {
  if (!image || image.mediaType !== 'VIDEO') return null;
  const fromResolver = getBestPlayableVideoSources(image).sources[0]?.url;
  if (fromResolver) return fromResolver;
  const normalized = normalizeVideoMediaItem(image);
  return normalized?.masterStreamUrl || null;
}

/**
 * Gallery card image URL.
 * Prefer preview / variants / download; use thumbnail only as last resort
 * (videos often only have /api/videos/{id}/thumbnail — that must show).
 */
export function getGalleryThumbSrc(image) {
  if (!image) return '';

  const variants = image.variants || {};
  const template = pickTemplateUrl(image);

  const preferred = firstNonThumbnailUrl(
    typeof variants.s01 === 'string' ? variants.s01 : null,
    typeof variants.tiers?.s01?.url === 'string' ? variants.tiers.s01.url : null,
    variants.recommendedUrl,
    variants.previewFallbackUrl,
    variants.autoUrl,
    image.previewUrl,
    image.downloadUrl,
    image.imageUrl,
  );
  if (preferred) return rewritePhotoStudioUrl(preferred);

  if (template) {
    const s01 = buildPhotoStudioVariantUrl(image, 's01', template);
    if (s01 && !isThumbnailUrl(s01)) return rewritePhotoStudioUrl(s01);
  }

  // Last resort so cards are not blank (image 404s handled by onError).
  const thumb = firstUrl(
    image.thumbnailUrl,
    variants.thumbnailUrl,
  );
  return thumb ? rewritePhotoStudioUrl(thumb) : '';
}

function firstUrl(...candidates) {
  for (const url of candidates) {
    if (typeof url === 'string' && url) return url;
  }
  return '';
}

/**
 * Full quality chain for lightbox: s01 → s10 → preview → download.
 * Thumbnail URLs are excluded from the progressive upgrade chain.
 */
export function buildProgressiveSrcChain(image) {
  if (!image) return [];

  const urls = [];
  const seen = new Set();
  const add = (url) => {
    if (!url || seen.has(url) || isThumbnailUrl(url)) return;
    seen.add(url);
    urls.push(url);
  };

  const variants = image.variants || {};
  const template = pickTemplateUrl(image);

  PHOTO_STUDIO_TIERS.forEach((tier) => {
    if (typeof variants[tier] === 'string') add(variants[tier]);
  });

  if (template) {
    PHOTO_STUDIO_TIERS.forEach((tier) => {
      if (typeof variants[tier] === 'string') return;
      if (variants.tiers?.[tier]?.available) {
        add(buildPhotoStudioVariantUrl(image, tier, template));
      }
    });
  }

  add(variants.recommendedUrl);
  add(variants.previewFallbackUrl);
  add(variants.autoUrl);
  add(image.previewUrl);
  add(image.downloadUrl);
  add(image.imageUrl);

  // Gallery/lightbox fallback: include thumbnail last if nothing else exists.
  if (urls.length === 0) {
    const thumb = firstUrl(image.thumbnailUrl, variants.thumbnailUrl);
    if (thumb) urls.push(thumb);
  }

  return urls.filter(Boolean);
}

/** True when at least one playable source exists (HLS or ready MP4 ladder). */
export function isVideoPlaybackReady(image) {
  if (image?.mediaType !== 'VIDEO') return false;
  if (getBestPlayableVideoSources(image).sources.length > 0) return true;
  const status = image.processingStatus || image.status;
  if (status === 'READY' || status === 'ACTIVE') return Boolean(resolveVideoStreamUrl(image));
  if (status === 'PROCESSING' || status === 'PENDING') return false;
  return Boolean(resolveVideoStreamUrl(image));
}

export function imageNeedsVariantPolling(image) {
  if (image?.mediaType === 'VIDEO') {
    const status = image.processingStatus || image.status;
    return status != null && status !== 'READY' && status !== 'ACTIVE';
  }
  const v = image?.variants;
  if (!v) return false;
  if (v.status === 'processing') return true;
  if (typeof v.readyCount === 'number' && typeof v.expectedCount === 'number') {
    return v.readyCount < v.expectedCount;
  }
  return false;
}

export function galleryNeedsVariantPolling(images = []) {
  return images.some(imageNeedsVariantPolling);
}

/**
 * Preload an image URL; resolves true on load, false on error.
 */
export function preloadImageSrc(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(false);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

/**
 * Walk the quality chain: show first src immediately, then upgrade as each tier loads.
 */
export async function loadProgressiveChain(chain, { onStep, signal } = {}) {
  if (!chain?.length) return '';

  let bestSrc = '';
  for (let i = 0; i < chain.length; i += 1) {
    if (signal?.aborted) break;
    const src = chain[i];
    // eslint-disable-next-line no-await-in-loop
    const ok = await preloadImageSrc(src);
    if (signal?.aborted) break;
    if (ok) {
      bestSrc = src;
      onStep?.(src, i, chain.length);
    }
  }
  return bestSrc || chain[0];
}
