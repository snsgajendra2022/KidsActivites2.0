/** Tenant header required by Spring Boot multi-tenant backend. */
export const TENANT_HEADER = 'X-Tenant-Slug';

const RAW_API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/**
 * True when the browser host is a tenant subdomain (e.g. ankits-workspace.localhost).
 */
export function isTenantSubdomainHost() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  if (/^[a-z0-9][a-z0-9-]*\.localhost$/.test(host)) return true;
  if (/^[a-z0-9][a-z0-9-]*\.schoolbridge\.app$/.test(host) && !host.startsWith('www.')) return true;
  if (/^[a-z0-9][a-z0-9-]*\.schoolbridge\.com$/.test(host) && !host.startsWith('www.')) return true;
  return false;
}

/**
 * Resolve tenant slug for API requests.
 * Priority: frontend hostname subdomain → VITE_TENANT_SLUG → demo (local backend).
 */
export function resolveTenantSlug() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();

    const prodMatch = host.match(/^([a-z0-9][a-z0-9-]*)\.schoolbridge\.(?:app|com)$/);
    if (prodMatch && prodMatch[1] !== 'www') return prodMatch[1];

    const localMatch = host.match(/^([a-z0-9][a-z0-9-]*)\.localhost$/);
    if (localMatch) return localMatch[1];
  }

  const fromEnv = import.meta.env.VITE_TENANT_SLUG?.trim();
  if (fromEnv) return fromEnv;

  if (RAW_API_URL.includes('localhost') || RAW_API_URL.includes('127.0.0.1')) {
    return 'demo';
  }

  return null;
}

/**
 * API base URL.
 * Uses VITE_API_URL when set; in production derives tenant API subdomain.
 */
export function resolveApiBaseUrl() {
  if (RAW_API_URL) return RAW_API_URL;

  if (isProductionMode()) {
    const tenant = resolveTenantSlug();
    if (tenant) {
      return `https://${tenant}.api.schoolbridge.app/api/v1`;
    }
  }

  return '';
}

export const API_BASE_URL = resolveApiBaseUrl();

export function isApiEnabled() {
  return Boolean(API_BASE_URL);
}

export function isProductionMode() {
  return import.meta.env.PROD || import.meta.env.VITE_PRODUCTION_MODE === 'true';
}

export function isForceMock() {
  return import.meta.env.VITE_FORCE_MOCK === 'true';
}

export function isApiFallbackMock() {
  return import.meta.env.VITE_API_FALLBACK_MOCK === 'true';
}
