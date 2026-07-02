import { isReservedSlug } from '../constants/reservedSlugs.js';
import { getSchoolBySlug } from '../services/schoolService.js';

/** Extract school slug from pathname e.g. /green-valley/enroll → green-valley */
export function extractSchoolSlugFromPath(pathname) {
  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment || isReservedSlug(segment)) return null;
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
