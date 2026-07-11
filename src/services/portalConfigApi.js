import { api } from './api/client.js';
import { resolveTenantSlug } from './api/config.js';
import { preloadBrandingImages } from '../utils/brandingUrlUtils.js';

const portalConfigCache = new Map();
let pendingPortalConfigRequest = null;

export function getCachedPortalConfig(tenantSlug = resolveTenantSlug()) {
  return tenantSlug ? portalConfigCache.get(tenantSlug) ?? null : null;
}

export function cachePortalConfig(config, tenantSlug = resolveTenantSlug()) {
  if (tenantSlug && config) {
    portalConfigCache.set(tenantSlug, config);
    preloadBrandingImages(config.branding, { priority: true });
  }
}

/** Fetch portal config once per in-flight request; dedupes concurrent callers. */
export async function fetchPortalConfigRaw() {
  if (pendingPortalConfigRequest) {
    return pendingPortalConfigRequest;
  }

  pendingPortalConfigRequest = api.get('/portal/config', undefined, { auth: false })
    .then((data) => {
      preloadBrandingImages(data?.branding, { priority: true });
      return data;
    })
    .finally(() => {
      pendingPortalConfigRequest = null;
    });

  return pendingPortalConfigRequest;
}
