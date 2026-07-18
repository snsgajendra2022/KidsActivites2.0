import { api } from './api/client.js';
import { resolveTenantSlug, TENANT_HEADER } from './api/config.js';
import { preloadBrandingImages } from '../utils/brandingUrlUtils.js';

const portalConfigCache = new Map();
const pendingPortalConfigByTenant = new Map();

export function getCachedPortalConfig(tenantSlug = resolveTenantSlug()) {
  return tenantSlug ? portalConfigCache.get(tenantSlug) ?? null : null;
}

export function cachePortalConfig(config, tenantSlug = resolveTenantSlug()) {
  if (tenantSlug && config) {
    portalConfigCache.set(tenantSlug, config);
    preloadBrandingImages(config.branding, { priority: true });
  }
}

/**
 * Fetch portal config for a workspace.
 * @param {string} [tenantSlug] - defaults to current URL tenant
 */
export async function fetchPortalConfigRaw(tenantSlug = resolveTenantSlug()) {
  if (!tenantSlug) {
    throw new Error('No workspace slug to load portal config');
  }

  const cached = portalConfigCache.get(tenantSlug);
  if (cached) return cached;

  const pending = pendingPortalConfigByTenant.get(tenantSlug);
  if (pending) return pending;

  const request = api.get('/portal/config', undefined, {
    auth: false,
    skipTenantHeader: true,
    headers: { [TENANT_HEADER]: tenantSlug },
  })
    .then((data) => {
      cachePortalConfig(data, tenantSlug);
      return data;
    })
    .finally(() => {
      pendingPortalConfigByTenant.delete(tenantSlug);
    });

  pendingPortalConfigByTenant.set(tenantSlug, request);
  return request;
}
