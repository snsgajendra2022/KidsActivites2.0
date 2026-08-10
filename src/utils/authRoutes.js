import { ROLE_DASHBOARD } from '../constants/roles.js';
import { prefixTenantPath } from './tenantUtils.js';

/**
 * Dashboard path for a signed-in user (tenant-prefixed when slug is known).
 */
export function authenticatedHomePath(user, fallbackTenantSlug = null) {
  if (!user?.role) return '/login';
  const slug = user.tenantSlug || fallbackTenantSlug || null;
  const dashboard = ROLE_DASHBOARD[user.role] || '/';
  return prefixTenantPath(dashboard, slug) || dashboard;
}
