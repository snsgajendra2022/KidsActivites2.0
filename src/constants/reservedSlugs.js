/** First URL segments that are NOT tenant slugs (platform routes, role prefixes at root). */
export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'assets',
  'enroll',
  'enrollment',
  'forgot-password',
  'login',
  'parent',
  'profile',
  'register-school',
  'reset-password',
  'security-policy',
  'static',
  'support',
  'system-status',
  'teacher',
  'terms-of-use',
  'verify-email',
  'workspace',
]);

/** Matches backend workspace slug validation: lowercase letters, numbers, hyphens. */
export const TENANT_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;

export function isReservedSlug(slug) {
  return !slug || RESERVED_SLUGS.has(slug.toLowerCase());
}

export function isValidTenantSlug(slug) {
  return Boolean(slug && !isReservedSlug(slug) && TENANT_SLUG_PATTERN.test(slug));
}
