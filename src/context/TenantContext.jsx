import { createContext, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { extractSchoolSlugFromPath, isAdminPath } from '../utils/tenantUtils.js';
import { getSchoolBySlug } from '../services/schoolService.js';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const { pathname } = useLocation();

  const value = useMemo(() => {
    const schoolSlug = extractSchoolSlugFromPath(pathname);
    const school = schoolSlug ? getSchoolBySlug(schoolSlug) : null;
    const urlSchoolId = school?.id ?? null;
    const isSchoolPublicRoute = Boolean(schoolSlug);
    const isAdminRoute = isAdminPath(pathname);

    const isPlatformHome = pathname === '/';
    const isPlatformEnrollment = pathname === '/enrollment';

    return {
      schoolSlug,
      urlSchoolId,
      school,
      isSchoolPublicRoute,
      isAdminRoute,
      isPlatformHome,
      isPlatformEnrollment,
      isPlatformPublic: isPlatformHome || isPlatformEnrollment,
    };
  }, [pathname]);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used inside TenantProvider');
  return ctx;
}

/** Safe hook — returns null outside TenantProvider (e.g. tests). */
export function useTenantOptional() {
  return useContext(TenantContext);
}
