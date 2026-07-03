import { isReservedSlug, isValidTenantSlug } from '../constants/reservedSlugs.js';
import { getSchoolBySlug } from '../services/schoolService.js';
import { isApiEnabled } from '../services/api/config.js';

/** First URL segment when it is a valid tenant slug (not a reserved route). */
export function extractSlugSegment(pathname) {
  const segment = pathname.split('/').filter(Boolean)[0];
  if (!isValidTenantSlug(segment)) return null;
  return segment;
}

/** Extract school slug from pathname e.g. /green-valley/enroll → green-valley */
export function extractSchoolSlugFromPath(pathname) {
  const segment = extractSlugSegment(pathname);
  if (!segment) return null;
  if (isApiEnabled()) return segment;
  const school = getSchoolBySlug(segment);
  return school?.slug ?? null;
}

/** Strip `/{tenantSlug}` prefix from a pathname when present. */
export function stripTenantPrefix(pathname, tenantSlug) {
  if (!tenantSlug || !pathname) return pathname;
  const prefix = `/${tenantSlug}`;
  if (pathname === prefix) return '/';
  if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length);
  return pathname;
}

/** Prefix an app-relative path with `/{tenantSlug}` when not already prefixed. */
export function prefixTenantPath(path, tenantSlug) {
  if (!path || !tenantSlug) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized === `/${tenantSlug}` || normalized.startsWith(`/${tenantSlug}/`)) {
    return normalized;
  }
  return `/${tenantSlug}${normalized}`;
}

export function isAdminPath(pathname) {
  const tenantSlug = extractSlugSegment(pathname);
  const routePath = stripTenantPrefix(pathname, tenantSlug);
  return routePath.startsWith('/admin')
    || routePath.startsWith('/parent')
    || routePath.startsWith('/teacher')
    || routePath === '/profile';
}

export function getSchoolBasePath(schoolSlug) {
  return schoolSlug ? `/${schoolSlug}` : '';
}

export function schoolEnrollPath(schoolSlug) {
  return schoolSlug ? `/${schoolSlug}/enroll` : '/enrollment';
}

export function schoolLoginPath(schoolSlug) {
  return schoolSlug ? `/${schoolSlug}/login` : '/login';
}
