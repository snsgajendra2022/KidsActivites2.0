/** Required pixel sizes for every landing builder image field. */

export const LANDING_IMAGE_MAX_BYTES_DEFAULT = 8 * 1024 * 1024;

/** Max allowed aspect-ratio drift from required (12%). */
const ASPECT_TOLERANCE = 0.12;

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   width: number,
 *   height: number,
 *   maxBytes: number,
 * }} ImageSpec
 */

/** Required size = width × height (image must be at least this large, and close to this aspect). */
/** @type {Record<string, ImageSpec>} */
export const IMAGE_SPECS = {
  logo: { id: 'logo', label: 'Logo', width: 512, height: 512, maxBytes: 2 * 1024 * 1024 },
  hero: { id: 'hero', label: 'Hero image', width: 1200, height: 1200, maxBytes: 8 * 1024 * 1024 },
  heroBackground: { id: 'heroBackground', label: 'Hero background', width: 1920, height: 1080, maxBytes: 10 * 1024 * 1024 },
  curriculum: { id: 'curriculum', label: 'Curriculum card', width: 512, height: 512, maxBytes: 2 * 1024 * 1024 },
  feature: { id: 'feature', label: 'Feature image', width: 800, height: 600, maxBytes: 5 * 1024 * 1024 },
  contentSplit: { id: 'contentSplit', label: 'Philosophy image', width: 1000, height: 1200, maxBytes: 8 * 1024 * 1024 },
  bento: { id: 'bento', label: 'Vision & mission card', width: 800, height: 480, maxBytes: 5 * 1024 * 1024 },
  featurePanel: { id: 'featurePanel', label: 'Feature panel', width: 1200, height: 900, maxBytes: 8 * 1024 * 1024 },
  gallery: { id: 'gallery', label: 'Gallery photo', width: 1200, height: 900, maxBytes: 8 * 1024 * 1024 },
  avatar: { id: 'avatar', label: 'Review avatar', width: 400, height: 400, maxBytes: 2 * 1024 * 1024 },
  banner: { id: 'banner', label: 'Banner', width: 1920, height: 800, maxBytes: 8 * 1024 * 1024 },
  mapFallback: { id: 'mapFallback', label: 'Map fallback', width: 1200, height: 800, maxBytes: 5 * 1024 * 1024 },
  ctaBackground: { id: 'ctaBackground', label: 'CTA background', width: 1920, height: 1080, maxBytes: 10 * 1024 * 1024 },
  default: { id: 'default', label: 'Image', width: 800, height: 600, maxBytes: 5 * 1024 * 1024 },
};

export function formatPx(width, height) {
  return `${width}×${height}px`;
}

export function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/** Always-visible required size line. */
export function specHint(spec) {
  const s = spec || IMAGE_SPECS.default;
  return `Required size: ${formatPx(s.width, s.height)} · Max file: ${formatBytes(s.maxBytes)}`;
}

function loadImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      URL.revokeObjectURL(url);
      if (!width || !height) {
        reject(new Error('Could not read image dimensions.'));
        return;
      }
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image.'));
    };
    img.src = url;
  });
}

function isImageFile(file) {
  if (file.type?.startsWith('image/')) return true;
  // Some browsers omit MIME — fall back to extension.
  return /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name || '');
}

/**
 * Strict landing image validation.
 * Rejects when too small OR wrong aspect ratio. Caller must NOT upload/onChange when ok=false.
 */
export async function validateLandingImage(file, spec) {
  const s = spec || IMAGE_SPECS.default;
  const required = formatPx(s.width, s.height);

  if (!file) {
    return { ok: false, error: 'No file selected.', required };
  }

  if (!isImageFile(file)) {
    return {
      ok: false,
      error: 'Not an image file. Please select JPG, PNG, or WebP.',
      required,
    };
  }

  if (file.size > s.maxBytes) {
    return {
      ok: false,
      error: `File is too large (${formatBytes(file.size)}). Maximum is ${formatBytes(s.maxBytes)}. Image was not uploaded.`,
      required,
      actual: formatBytes(file.size),
    };
  }

  let dimensions;
  try {
    dimensions = await loadImageDimensions(file);
  } catch {
    return {
      ok: false,
      error: 'Could not read this image. Try another JPG/PNG/WebP file.',
      required,
    };
  }

  const { width, height } = dimensions;
  const actual = formatPx(width, height);

  if (width < s.width || height < s.height) {
    return {
      ok: false,
      error: `Wrong size. Your image is ${actual}. Required is at least ${required}. Image was not uploaded.`,
      required,
      actual,
    };
  }

  const requiredAspect = s.width / s.height;
  const actualAspect = width / height;
  const aspectDrift = Math.abs(actualAspect - requiredAspect) / requiredAspect;
  if (aspectDrift > ASPECT_TOLERANCE) {
    return {
      ok: false,
      error: `Wrong proportions. Your image is ${actual}. Required size/shape is ${required}. Image was not uploaded.`,
      required,
      actual,
    };
  }

  return { ok: true, width, height };
}
