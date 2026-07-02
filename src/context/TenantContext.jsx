import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { extractSlugSegment, isAdminPath } from '../utils/tenantUtils.js';
import { getSchoolBySlug, resolveSchoolBySlug } from '../services/schoolService.js';
import { isApiEnabled, isTenantSubdomainHost, resolveTenantSlug } from '../services/api/config.js';

const TenantContext = createContext(null);

function provisionalSchoolId(slug) {
  if (!slug || !isApiEnabled()) return null;
  const tenant = resolveTenantSlug();
  if (tenant && slug.toLowerCase() === tenant.toLowerCase()) {
    return `school-${tenant}`;
  }
  return null;
}

export function TenantProvider({ children }) {
  const { pathname } = useLocation();
  const segment = useMemo(() => extractSlugSegment(pathname), [pathname]);
  const tenantSlug = useMemo(() => resolveTenantSlug(), []);
  const isTenantSubdomain = useMemo(
    () => isTenantSubdomainHost() && Boolean(tenantSlug),
    [tenantSlug],
  );
  const effectiveSlug = useMemo(
    () => segment || (isTenantSubdomain ? tenantSlug : null),
    [segment, isTenantSubdomain, tenantSlug],
  );
  const [school, setSchool] = useState(null);
  const [schoolResolving, setSchoolResolving] = useState(false);

  useEffect(() => {
    if (!effectiveSlug) {
      setSchool(null);
      setSchoolResolving(false);
      return undefined;
    }

    if (!isApiEnabled()) {
      setSchool(getSchoolBySlug(effectiveSlug));
      setSchoolResolving(false);
      return undefined;
    }

    let cancelled = false;
    setSchoolResolving(true);
    resolveSchoolBySlug(effectiveSlug)
      .then((resolved) => {
        if (!cancelled) setSchool(resolved);
      })
      .catch(() => {
        if (!cancelled) setSchool(null);
      })
      .finally(() => {
        if (!cancelled) setSchoolResolving(false);
      });

    return () => { cancelled = true; };
  }, [effectiveSlug]);

  const value = useMemo(() => {
    const schoolSlug = school?.slug ?? (isTenantSubdomain ? tenantSlug : null);
    const urlSchoolId = school?.id ?? provisionalSchoolId(effectiveSlug);
    const isSchoolPublicRoute = Boolean(effectiveSlug);
    const isAdminRoute = isAdminPath(pathname);

    const isPlatformHome = pathname === '/' && !isTenantSubdomain;
    const isPlatformEnrollment = pathname === '/enrollment' && !isTenantSubdomain;
    const isPlatformLogin = pathname === '/login' && !isTenantSubdomain;
    const isWorkspaceRoute = pathname.startsWith('/workspace');

    return {
      tenantSlug,
      isTenantSubdomain,
      schoolSlug,
      urlSchoolId,
      school,
      schoolResolving,
      isSchoolPublicRoute,
      isAdminRoute,
      isPlatformHome,
      isPlatformEnrollment,
      isPlatformLogin,
      isWorkspaceRoute,
      isPlatformPublic: isPlatformHome || isPlatformEnrollment || isPlatformLogin || isWorkspaceRoute,
    };
  }, [pathname, effectiveSlug, isTenantSubdomain, tenantSlug, school, schoolResolving]);

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
