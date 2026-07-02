/** First URL segments that are NOT school slugs (e.g. /admin, /login). */
export const RESERVED_SLUGS = new Set([
  'admin',
  'login',
  'enroll',
  'parent',
  'teacher',
  'profile',
  'security-policy',
  'terms-of-use',
  'system-status',
  'support',
]);

export function isReservedSlug(slug) {
  return !slug || RESERVED_SLUGS.has(slug.toLowerCase());
}
