import { isReservedSlug } from '../constants/reservedSlugs.js';
import { getSchoolBySlug } from '../services/schoolService.js';
import { isApiEnabled } from '../services/api/config.js';

/** First URL segment when it is not a reserved route (e.g. admin, login). */
export function extractSlugSegment(pathname) {
  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment || isReservedSlug(segment)) return null;
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

export function isAdminPath(pathname) {
  return pathname.startsWith('/admin')
    || pathname.startsWith('/parent')
    || pathname.startsWith('/teacher')
    || pathname === '/profile';
}

export function getSchoolBasePath(schoolSlug) {
  return schoolSlug ? `/${schoolSlug}` : '';
}

export function schoolEnrollPath(schoolSlug) {
  return schoolSlug ? `/${schoolSlug}/enroll` : '/';
}

export function schoolLoginPath(schoolSlug) {
  return schoolSlug ? `/${schoolSlug}/login` : '/login';
}
