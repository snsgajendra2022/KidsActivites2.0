import { API_BASE_URL, resolveTenantSlug, TENANT_HEADER } from './config.js';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './tokenStorage.js';
import { useNetworkStore } from '../../store/networkStore.js';

export const AUTH_SESSION_EXPIRED_EVENT = 'auth:session-expired';

class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isTransientHttpStatus(status) {
  return status === 0 || status === 502 || status === 503 || status === 504;
}

export function isTransientApiError(err) {
  if (!err) return false;
  if (err instanceof TypeError) return true;
  if (err instanceof ApiError) {
    if (err.status === 0 || err.code === 'NETWORK_ERROR' || err.code === 'SERVER_UNAVAILABLE') {
      return true;
    }
    if ([502, 503, 504].includes(err.status)) return true;
  }
  return err?.message === 'Failed to fetch';
}

function setServerReconnecting(reconnecting) {
  useNetworkStore.getState().setServerReconnecting(reconnecting);
}

function notifySessionExpired() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
}

function parseJsonBody(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function throwApiError(res, json, text) {
  if (res.status === 413) {
    const err = json?.error;
    throw new ApiError(
      err?.message && !/entity too large|request entity too large|payload too large/i.test(err.message)
        ? err.message
        : 'File is too large for the server. Please choose a smaller file.',
      413,
      err?.code || 'FILE_TOO_LARGE',
      err?.details,
    );
  }
  const err = json?.error;
  throw new ApiError(
    err?.message || text || `Request failed (${res.status})`,
    res.status,
    err?.code,
    err?.details,
  );
}

async function parseResponse(res) {
  const text = await res.text();
  const json = parseJsonBody(text);

  if (!res.ok) {
    throwApiError(res, json, text);
  }

  if (json && typeof json.success === 'boolean') {
    if (!json.success) {
      throw new ApiError(json.error?.message || 'Request failed', res.status, json.error?.code);
    }
    return json.data;
  }

  return json;
}

async function parseResponseWithMeta(res) {
  const text = await res.text();
  const json = parseJsonBody(text);

  if (!res.ok) {
    throwApiError(res, json, text);
  }

  if (json && typeof json.success === 'boolean') {
    if (!json.success) {
      throw new ApiError(json.error?.message || 'Request failed', res.status, json.error?.code);
    }
    return { data: json.data, meta: json.meta || {} };
  }

  return { data: json, meta: {} };
}

function buildHeaders(extra = {}, { auth = true, skipTenantHeader = false } = {}) {
  const reqHeaders = { ...extra };

  if (!skipTenantHeader) {
    const tenantSlug = resolveTenantSlug();
    if (tenantSlug) {
      reqHeaders[TENANT_HEADER] = tenantSlug;
    }
  }

  if (auth) {
    const token = getAccessToken();
    if (token) reqHeaders.Authorization = `Bearer ${token}`;
  }

  return reqHeaders;
}

/** @returns {{ ok: true, token: string } | { ok: false, reason: 'missing' | 'expired' | 'transient' }} */
async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return { ok: false, reason: 'missing' };

  let res;
  try {
    res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': 'application/json' }, { auth: false }),
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    setServerReconnecting(true);
    return { ok: false, reason: 'transient' };
  }

  if (res.ok) {
    const data = await parseResponse(res);
    if (data?.accessToken) {
      setTokens(data.accessToken, data.refreshToken || refreshToken);
      setServerReconnecting(false);
      return { ok: true, token: data.accessToken };
    }
    return { ok: false, reason: 'expired' };
  }

  if (res.status === 401 || res.status === 403) {
    clearTokens();
    return { ok: false, reason: 'expired' };
  }

  if (isTransientHttpStatus(res.status)) {
    setServerReconnecting(true);
    return { ok: false, reason: 'transient' };
  }

  setServerReconnecting(true);
  return { ok: false, reason: 'transient' };
}

function buildUrl(path, params) {
  const url = new URL(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

async function executeRequest(path, options = {}, parser = parseResponse) {
  const {
    method = 'GET',
    body,
    params,
    headers = {},
    auth = true,
    retry = true,
    skipTenantHeader = false,
  } = options;

  const reqHeaders = buildHeaders(headers, { auth, skipTenantHeader });
  if (body !== undefined && !(body instanceof FormData)) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(buildUrl(path, params), {
      method,
      headers: reqHeaders,
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    setServerReconnecting(true);
    const hint = networkErr?.message === 'Failed to fetch'
      ? `Cannot reach the API at ${API_BASE_URL}. Ensure the backend is running and reachable from this device.`
      : (networkErr?.message || 'Network request failed');
    throw new ApiError(hint, 0, 'NETWORK_ERROR');
  }

  if (res.status === 401 && auth && retry) {
    const refresh = await refreshAccessToken();
    if (refresh.ok) {
      return executeRequest(path, { ...options, retry: false }, parser);
    }
    if (refresh.reason === 'transient') {
      throw new ApiError(
        'Server temporarily unavailable. Your session is preserved.',
        503,
        'SERVER_UNAVAILABLE',
      );
    }
    notifySessionExpired();
    throw new ApiError('Session expired. Please sign in again.', 401, 'SESSION_EXPIRED');
  }

  if (isTransientHttpStatus(res.status)) {
    setServerReconnecting(true);
    throw new ApiError(
      'Server temporarily unavailable. Please try again shortly.',
      res.status,
      'SERVER_UNAVAILABLE',
    );
  }

  if (res.status === 403 && typeof window !== 'undefined') {
    const text = await res.clone().text();
    const json = parseJsonBody(text);
    const code = json?.error?.code;
    if (code === 'TENANT_SUSPENDED' || code === 'TENANT_ARCHIVED' || code === 'TENANT_FAILED') {
      throw new ApiError(json.error?.message || 'Workspace unavailable', 403, code);
    }
  }

  const result = await parser(res);
  setServerReconnecting(false);
  return result;
}

export async function apiRequest(path, options = {}) {
  return executeRequest(path, options, parseResponse);
}

export async function apiRequestWithMeta(path, options = {}) {
  return executeRequest(path, options, parseResponseWithMeta);
}

export const api = {
  get: (path, params, opts) => apiRequest(path, { ...opts, method: 'GET', params }),
  post: (path, body, opts) => apiRequest(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => apiRequest(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => apiRequest(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => apiRequest(path, { ...opts, method: 'DELETE' }),
  getWithMeta: (path, params, opts) => apiRequestWithMeta(path, { ...opts, method: 'GET', params }),
};

export { ApiError };
