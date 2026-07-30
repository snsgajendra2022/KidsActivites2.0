import { API_BASE_URL, resolveTenantSlug, TENANT_HEADER } from '../api/config.js';
import { getAccessToken } from '../api/tokenStorage.js';

/**
 * Live tracking uses the same Spring Boot API as the rest of the app
 * (`VITE_API_URL`). No separate tracking host is required.
 */
function trackingApiBase() {
  return API_BASE_URL;
}

function parseJsonSafe(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function trackingFetch(path, { method = 'GET', body, auth = true } = {}) {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_URL is not configured. Point it at your Spring Boot API.');
  }

  const headers = {
    Accept: 'application/json',
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const tenant = resolveTenantSlug();
  if (tenant) headers[TENANT_HEADER] = tenant;

  const res = await fetch(`${trackingApiBase()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  const json = parseJsonSafe(text);

  if (!res.ok) {
    const message = json?.error?.message || text || `Tracking request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.code = json?.error?.code;
    throw err;
  }

  return json && typeof json.success === 'boolean' ? json.data : json;
}

export async function fetchAdminFleetLive(status = 'all') {
  const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  return trackingFetch(`/admin/transport/live${query}`);
}

export async function fetchParentTransportLive() {
  return trackingFetch('/parent/transport/live');
}

export async function startTransportTrip(payload) {
  return trackingFetch('/tracking/trips/start', { method: 'POST', body: payload });
}

export async function completeTransportTrip(tripId, payload = {}) {
  return trackingFetch(`/tracking/trips/${tripId}/complete`, { method: 'POST', body: payload });
}

export async function updateDriverLocation(payload) {
  return trackingFetch('/tracking/update-location', { method: 'POST', body: payload });
}

export async function registerGpsDevice(payload) {
  return trackingFetch('/admin/transport/gps-devices', { method: 'POST', body: payload });
}

export async function fetchTripHistory(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') qs.set(key, value);
  });
  const suffix = qs.toString() ? `?${qs}` : '';
  return trackingFetch(`/admin/transport/trips${suffix}`);
}

/** WebSocket URL derived from the same Spring Boot host as VITE_API_URL. */
export function getTrackingWebSocketUrl({ vehicleId } = {}) {
  const api = trackingApiBase().replace(/\/api\/v1\/?$/, '');
  const wsBase = `${api.replace(/^http/, 'ws')}/ws/tracking`;
  const token = getAccessToken();
  const url = new URL(wsBase.includes('://') ? wsBase : `${window.location.origin}${wsBase}`);
  if (token) url.searchParams.set('token', token);
  if (vehicleId) url.searchParams.set('vehicleId', vehicleId);
  return url.toString();
}
