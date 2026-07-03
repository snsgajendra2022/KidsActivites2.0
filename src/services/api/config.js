import { isValidTenantSlug } from '../../constants/reservedSlugs.js';
import { extractSlugSegment } from '../../utils/tenantUtils.js';

/** Tenant header required by Spring Boot multi-tenant backend. */
export const TENANT_HEADER = 'X-Tenant-Slug';

/** Ensure base URL ends with /api/v1 (common misconfig: .../api without /v1). */
export function normalizeApiBaseUrl(raw) {
  if (!raw) return '';
  const trimmed = raw.replace(/\/$/, '');
  if (/\/api$/i.test(trimmed)) {
    if (import.meta.env.DEV) {
      console.warn(
        '[SchoolBridge] VITE_API_URL should end with /api/v1 — auto-correcting to',
        `${trimmed}/v1`,
      );
    }
    return `${trimmed}/v1`;
  }
  return trimmed;
}

const RAW_API_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL || '');

function isLocalhostHost(hostname) {
  const h = (hostname ?? '').toLowerCase();
  return h === 'localhost' || h === '127.0.0.1';
}

function apiUrlPointsToLocalhost(apiUrl) {
  if (!apiUrl) return false;
  try {
    return isLocalhostHost(new URL(apiUrl).hostname);
  } catch {
    return /localhost|127\.0\.0\.1/i.test(apiUrl);
  }
}

/** In dev, rewrite localhost API URL when the app is opened via LAN IP. */
function rewriteApiUrlForLanDev(apiUrl) {
  if (!import.meta.env.DEV || typeof window === 'undefined' || !apiUrl) return apiUrl;
  if (!apiUrlPointsToLocalhost(apiUrl)) return apiUrl;

  const browserHost = window.location.hostname;
  if (isLocalhostHost(browserHost)) return apiUrl;

  try {
    const parsed = new URL(apiUrl);
    const port = parsed.port || '8081';
    const rewritten = `${parsed.protocol}//${browserHost}:${port}${parsed.pathname}${parsed.search}`;
    console.warn(
      '[SchoolBridge] VITE_API_URL points at localhost but the app is open on',
      `${browserHost}; rewriting API base to`,
      rewritten,
    );
    return rewritten;
  } catch {
    return apiUrl;
  }
}

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

function resolveTenantSlugFromSubdomainHost() {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname.toLowerCase();

  const prodMatch = host.match(/^([a-z0-9][a-z0-9-]*)\.schoolbridge\.(?:app|com)$/);
  if (prodMatch && prodMatch[1] !== 'www' && isValidTenantSlug(prodMatch[1])) return prodMatch[1];

  const localMatch = host.match(/^([a-z0-9][a-z0-9-]*)\.localhost$/);
  if (localMatch && isValidTenantSlug(localMatch[1])) return localMatch[1];

  return null;
}

/**
 * Resolve tenant slug for API requests.
 * Priority: URL path `/{slug}/...` → subdomain host → VITE_TENANT_SLUG (dev fallback).
 */
export function resolveTenantSlug() {
  if (typeof window !== 'undefined') {
    const fromPath = extractSlugSegment(window.location.pathname);
    if (fromPath) return fromPath;

    const fromSubdomain = resolveTenantSlugFromSubdomainHost();
    if (fromSubdomain) return fromSubdomain;
  }

  const fromEnv = import.meta.env.VITE_TENANT_SLUG?.trim();
  if (fromEnv && isValidTenantSlug(fromEnv)) return fromEnv;

  return null;
}

/**
 * API base URL.
 * Uses VITE_API_URL when set; in production derives tenant API subdomain.
 */
export function resolveApiBaseUrl() {
  if (RAW_API_URL) return rewriteApiUrlForLanDev(RAW_API_URL);

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
