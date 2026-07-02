import { useTenant } from '../context/TenantContext.jsx';
import { getSchoolBasePath, schoolEnrollPath } from '../utils/tenantUtils.js';

export function useSchoolBasePath() {
  const { schoolSlug } = useTenant();
  return getSchoolBasePath(schoolSlug);
}

export function useSchoolEnrollPath() {
  const { schoolSlug } = useTenant();
  return schoolSlug ? schoolEnrollPath(schoolSlug) : '/';
}
