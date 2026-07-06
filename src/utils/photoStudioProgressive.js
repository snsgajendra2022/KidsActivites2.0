import { rewritePhotoStudioUrl } from './photoStudioUrls.js';

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

function pickTemplateUrl(image) {
  const v = image?.variants || {};
  const tierS01 = v.tiers?.s01?.url;
  return (
    (typeof v.s01 === 'string' ? v.s01 : null)
    || (typeof tierS01 === 'string' ? tierS01 : null)
    || (typeof v.thumbnailUrl === 'string' ? v.thumbnailUrl : null)
    || v.autoUrl
    || v.recommendedUrl
    || v.previewFallbackUrl
    || image?.thumbnailUrl
    || image?.previewUrl
    || image?.downloadUrl
    || null
  );
}

function isThumbnailUrl(url) {
  return typeof url === 'string' && /\/thumbnail(\?|$)/.test(url);
}

/**
 * Lowest-quality variant (s01) for gallery grid cards — not thumbnail, not full preview.
 */
export function getGalleryThumbSrc(image) {
  if (!image) return '';

  const variants = image.variants || {};
  const template = pickTemplateUrl(image);

  if (typeof variants.s01 === 'string') {
    return rewritePhotoStudioUrl(variants.s01);
  }
  const tierS01 = variants.tiers?.s01?.url;
  if (typeof tierS01 === 'string') {
    return rewritePhotoStudioUrl(tierS01);
  }

  if (template) {
    const s01 = buildPhotoStudioVariantUrl(image, 's01', template);
    if (s01) return rewritePhotoStudioUrl(s01);
  }

  return rewritePhotoStudioUrl(
    image.thumbnailUrl || image.previewUrl || image.downloadUrl || '',
  );
}

/**
 * Full quality chain for lightbox only: s01 → s10 → preview → download.
 * Thumbnail URLs are never included.
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

  // Direct string URLs on variants (when API embeds them)
  PHOTO_STUDIO_TIERS.forEach((tier) => {
    if (typeof variants[tier] === 'string') add(variants[tier]);
  });

  // Build tier URLs only when the API marks them ready
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
  add(image.previewUrl);
  add(image.downloadUrl);

  return urls.filter(Boolean);
}

/** True when an HLS stream is ready to play (at least one rendition or master playlist). */
export function isVideoPlaybackReady(image) {
  if (image?.mediaType !== 'VIDEO') return false;
  const status = image.processingStatus || image.status;
  if (status === 'READY' || status === 'ACTIVE') return true;
  if (status === 'PROCESSING') return false;
  return Boolean(image.streamUrl);
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
