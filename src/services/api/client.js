import { API_BASE_URL } from './config.js';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './tokenStorage.js';

class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function parseResponse(res) {
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const err = json?.error;
    throw new ApiError(
      err?.message || text || `Request failed (${res.status})`,
      res.status,
      err?.code,
      err?.details,
    );
  }

  if (json && typeof json.success === 'boolean') {
    if (!json.success) {
      throw new ApiError(json.error?.message || 'Request failed', res.status, json.error?.code);
    }
    return json.data;
  }

  return json;
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearTokens();
    return null;
  }

  const data = await parseResponse(res);
  if (data?.accessToken) {
    setTokens(data.accessToken, data.refreshToken || refreshToken);
    return data.accessToken;
  }
  return null;
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

export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, params, headers = {}, auth = true, retry = true } = options;

  const reqHeaders = { ...headers };
  if (body !== undefined && !(body instanceof FormData)) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = getAccessToken();
    if (token) reqHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path, params), {
    method,
    headers: reqHeaders,
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiRequest(path, { ...options, retry: false });
    }
  }

  return parseResponse(res);
}

export const api = {
  get: (path, params, opts) => apiRequest(path, { ...opts, method: 'GET', params }),
  post: (path, body, opts) => apiRequest(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => apiRequest(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => apiRequest(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => apiRequest(path, { ...opts, method: 'DELETE' }),
};

export { ApiError };
