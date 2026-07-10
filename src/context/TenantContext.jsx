import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  extractSlugSegment,
  isAdminPath,
  stripTenantPrefix,
} from '../utils/tenantUtils.js';
import { getSchoolBySlug, resolveSchoolBySlug } from '../services/schoolService.js';
import {
  isApiEnabled,
  isTenantSubdomainHost,
  resolveTenantSlug,
} from '../services/api/config.js';

const TenantContext = createContext(null);

function provisionalSchoolId(slug) {
  if (!slug || !isApiEnabled()) return null;
  return `school-${slug}`;
}

export function TenantProvider({ children }) {
  const { pathname } = useLocation();
  const pathTenantSlug = useMemo(() => extractSlugSegment(pathname), [pathname]);
  const tenantSlug = useMemo(() => resolveTenantSlug(), [pathname]);
  const isTenantSubdomain = useMemo(
    () => isTenantSubdomainHost() && Boolean(tenantSlug) && !pathTenantSlug,
    [tenantSlug, pathTenantSlug],
  );
  const isTenantRoute = Boolean(pathTenantSlug);
  const effectiveSlug = pathTenantSlug || (isTenantSubdomain ? tenantSlug : null);
  const routePath = useMemo(
    () => stripTenantPrefix(pathname, pathTenantSlug),
    [pathname, pathTenantSlug],
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
    const schoolSlug = school?.slug ?? effectiveSlug;
    const urlSchoolId = school?.id ?? provisionalSchoolId(effectiveSlug);
    const isSchoolPublicRoute = Boolean(effectiveSlug);
    const isAdminRoute = isAdminPath(pathname);

    const isPlatformHome = routePath === '/' && !isTenantRoute && !isTenantSubdomain;
    const isPlatformEnrollment = routePath === '/enrollment' && !isTenantRoute;
    const isPlatformLogin = routePath === '/login' && !isTenantRoute;
    const isLoginRoute = routePath === '/login';
    const isWorkspaceRoute = routePath.startsWith('/workspace');
    const isRegisterSchoolRoute = routePath === '/register-school';

    return {
      tenantSlug: effectiveSlug,
      pathTenantSlug,
      isTenantRoute,
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
      isLoginRoute,
      isWorkspaceRoute,
      isRegisterSchoolRoute,
      isPlatformPublic: isPlatformHome || isPlatformEnrollment || isPlatformLogin || isWorkspaceRoute || isRegisterSchoolRoute,
    };
  }, [
    pathname,
    routePath,
    effectiveSlug,
    pathTenantSlug,
    isTenantRoute,
    isTenantSubdomain,
    school,
    schoolResolving,
  ]);

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
