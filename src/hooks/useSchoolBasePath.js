import { useTenant } from '../context/TenantContext.jsx';
import { getSchoolBasePath, schoolEnrollPath } from '../utils/tenantUtils.js';

export function useSchoolBasePath() {
  const { schoolSlug, tenantSlug } = useTenant();
  return getSchoolBasePath(tenantSlug || schoolSlug);
}

export function useSchoolEnrollPath() {
  const { schoolSlug, isPlatformPublic, tenantSlug } = useTenant();
  const slug = tenantSlug || schoolSlug;
  if (slug) return schoolEnrollPath(slug);
  return isPlatformPublic ? '/enrollment' : '/';
}
