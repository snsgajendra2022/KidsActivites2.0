import { useMemo } from 'react';
import { useTenant } from '../context/TenantContext.jsx';
import { prefixTenantPath } from '../utils/tenantUtils.js';
import { ROLE_DASHBOARD } from '../constants/roles.js';

/** Prefix app paths with the current tenant slug from the URL. */
export function useTenantPath() {
  const { tenantSlug, schoolSlug } = useTenant();
  const slug = tenantSlug || schoolSlug || null;

  return useMemo(() => ({
    tenantSlug: slug,
    tenantPath: (path) => prefixTenantPath(path, slug),
    // Auth redirects always use platform login (not /{tenant}/login).
    loginPath: '/login',
    roleDashboard: (role) => prefixTenantPath(ROLE_DASHBOARD[role] || '/login', slug),
  }), [slug]);
}
