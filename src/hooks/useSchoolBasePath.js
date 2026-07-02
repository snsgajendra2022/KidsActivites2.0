import { useTenant } from '../context/TenantContext.jsx';
import { getSchoolBasePath, schoolEnrollPath } from '../utils/tenantUtils.js';

export function useSchoolBasePath() {
  const { schoolSlug, isTenantSubdomain } = useTenant();
  if (isTenantSubdomain) return '/';
  return getSchoolBasePath(schoolSlug);
}

export function useSchoolEnrollPath() {
  const { schoolSlug, isPlatformPublic, isTenantSubdomain } = useTenant();
  if (isTenantSubdomain) return '/enrollment';
  if (schoolSlug) return schoolEnrollPath(schoolSlug);
  return isPlatformPublic ? '/enrollment' : '/';
}
