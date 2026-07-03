import { useMemo } from 'react';
import { useTenant } from '../context/TenantContext.jsx';
import { prefixTenantPath } from '../utils/tenantUtils.js';
import { ROLE_DASHBOARD } from '../constants/roles.js';

/** Prefix app paths with the current tenant slug from the URL. */
export function useTenantPath() {
  const { tenantSlug } = useTenant();

  return useMemo(() => ({
    tenantSlug,
    tenantPath: (path) => prefixTenantPath(path, tenantSlug),
    loginPath: tenantSlug ? `/${tenantSlug}/login` : '/login',
    roleDashboard: (role) => prefixTenantPath(ROLE_DASHBOARD[role] || '/login', tenantSlug),
  }), [tenantSlug]);
}
