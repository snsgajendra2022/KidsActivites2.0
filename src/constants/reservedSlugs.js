/** First URL segments that are NOT tenant slugs (platform routes, role prefixes at root).
 *  Note: {@code admin} is intentionally NOT reserved — it is the platform operator workspace
 *  ({@code /admin/login}). Public signup still blocks the slug on the backend. */
export const RESERVED_SLUGS = new Set([
  'api',
  'assets',
  'enroll',
  'enrollment',
  'forgot-password',
  'login',
  'parent',
  'privacy-policy',
  'privacy&policy',
  'profile',
  'register-school',
  'reset-password',
  'security-policy',
  'static',
  'support',
  'system-status',
  'teacher',
  'term&condition',
  'terms-and-conditions',
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
