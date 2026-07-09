import { getDocumentDownloadUrl } from '../services/documentService.js';

export const BRANDING_IMAGE_KEYS = [
  'logoUrl',
  'logoIconUrl',
  'faviconUrl',
  'heroImageUrl',
  'loginHeroUrl',
];

/** Strip mock storage placeholders and empty values. */
export function sanitizeBrandingValue(value) {
  if (!value || typeof value !== 'string') return null;
  if (value.startsWith('__asset__:')) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function sanitizeBranding(branding = {}) {
  const next = { ...branding };
  BRANDING_IMAGE_KEYS.forEach((key) => {
    next[key] = sanitizeBrandingValue(next[key]);
  });
  return next;
}

function isDirectImageUrl(value) {
  return value.startsWith('data:')
    || value.startsWith('http://')
    || value.startsWith('https://')
    || value.startsWith('//')
    || value.startsWith('blob:');
}

function isPublicPath(value) {
  return value.startsWith('/') && !value.startsWith('//');
}

/** Resolve file keys and relative paths to a browser-loadable image URL. */
export async function resolveBrandingImageUrl(value) {
  const clean = sanitizeBrandingValue(value);
  if (!clean) return null;
  if (isDirectImageUrl(clean) || isPublicPath(clean)) return clean;

  try {
    const resolved = await getDocumentDownloadUrl(clean);
    return resolved || null;
  } catch (err) {
    console.warn('[branding] Could not resolve image URL:', clean, err?.message);
    return null;
  }
}

export async function resolveBranding(branding = {}) {
  const sanitized = sanitizeBranding(branding);
  const entries = await Promise.all(
    BRANDING_IMAGE_KEYS.map(async (key) => {
      const value = sanitized[key];
      if (!value) return [key, null];
      if (isDirectImageUrl(value) || isPublicPath(value)) return [key, value];
      const resolved = await resolveBrandingImageUrl(value);
      return [key, resolved];
    }),
  );
  return Object.fromEntries(entries);
}

export async function resolveConfigBranding(config) {
  if (!config) return config;
  const branding = await resolveBranding(config.branding || {});
  return { ...config, branding };
}
