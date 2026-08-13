import { API_BASE_URL, resolveTenantSlug, TENANT_HEADER } from '../api/config.js';
import { getAccessToken } from '../api/tokenStorage.js';
import { normalizeGpsDevice, normalizeParentLiveSnapshot } from '../../types/transportModels.js';
import {
  fixtureAdminFleet,
  fixtureApproveStudentDropoff,
  fixtureApproveStudentPickup,
  fixtureDriverCurrentTrip,
  fixtureGpsDevices,
  fixtureMarkStudentDropoff,
  fixtureMarkStudentPickup,
  fixtureParentLive,
  fixtureParentStudentTripStatus,
  fixtureStartTrip,
  fixtureTripStopStudents,
  fixtureTripStudentTransportStatuses,
  isTransportFixtureMode,
} from './fixtures.js';
import {
  normalizeParentStudentTripStatus,
  normalizeStopAssignedStudent,
  normalizeTripStopStudentsPayload,
} from '../../utils/transportStudentAttendance.js';

/**
 * Live tracking uses the same Spring Boot API as the rest of the app
 * (`VITE_API_URL`). No separate tracking host is required.
 *
 * DEV ONLY: set VITE_TRANSPORT_API_MODE=fixture to use static snapshots.
 * Production always uses real HTTP (fixture forced off).
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

function asList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export async function fetchAdminFleetLive(status = 'all') {
  if (isTransportFixtureMode()) return fixtureAdminFleet(status);
  const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  try {
    const data = await trackingFetch(`/admin/transport/live${query}`);
    return asList(data);
  } catch (err) {
    // Soft empty when Spring Boot live endpoint is not deployed yet.
    if (err?.status === 404 || err?.code === 'NOT_FOUND') return [];
    throw err;
  }
}

export async function fetchParentTransportLive(params = {}) {
  if (isTransportFixtureMode()) return normalizeParentLiveSnapshot(fixtureParentLive(params));
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') qs.set(key, value);
  });
  const suffix = qs.toString() ? `?${qs}` : '';
  try {
    const data = await trackingFetch(`/parent/transport/live${suffix}`);
    return normalizeParentLiveSnapshot(data);
  } catch (err) {
    // Soft "no assignment / no trip" — not a hard failure for the parent UI.
    if (err?.status === 404 || err?.code === 'NOT_FOUND'
      || /not (found|assigned)|no (active )?trip|no assignment/i.test(err?.message || '')) {
      return null;
    }
    throw err;
  }
}

export async function listGpsDevices(params = {}) {
  if (isTransportFixtureMode()) return fixtureGpsDevices().map(normalizeGpsDevice).filter(Boolean);
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') qs.set(key, value);
  });
  const suffix = qs.toString() ? `?${qs}` : '';
  try {
    const data = await trackingFetch(`/admin/transport/gps-devices${suffix}`);
    return asList(data).map(normalizeGpsDevice).filter(Boolean);
  } catch (err) {
    if (err?.status === 404 || err?.code === 'NOT_FOUND') return [];
    throw err;
  }
}

export async function rotateGpsDeviceToken(deviceId) {
  if (isTransportFixtureMode()) {
    return {
      id: deviceId,
      deviceToken: `fixture-rotated-${Date.now().toString(36)}`,
      status: 'active',
    };
  }
  const result = await trackingFetch(`/admin/transport/gps-devices/${deviceId}/rotate-token`, {
    method: 'POST',
    body: {},
  });
  return normalizeGpsDevice(result) || result;
}

export async function setGpsDeviceStatus(deviceId, status) {
  if (isTransportFixtureMode()) {
    return { id: deviceId, status };
  }
  const result = await trackingFetch(`/admin/transport/gps-devices/${deviceId}`, {
    method: 'PATCH',
    body: { status },
  });
  return normalizeGpsDevice(result) || result;
}

export async function enableGpsDevice(deviceId) {
  return setGpsDeviceStatus(deviceId, 'active');
}

export async function disableGpsDevice(deviceId) {
  return setGpsDeviceStatus(deviceId, 'disabled');
}

export async function fetchDriverCurrentTrip() {
  if (isTransportFixtureMode()) return fixtureDriverCurrentTrip();
  try {
    return await trackingFetch('/driver/transport/current-trip');
  } catch (err) {
    if (err?.status === 404 || err?.code === 'NOT_FOUND') {
      try {
        return await trackingFetch('/driver/transport/assignment');
      } catch (inner) {
        if (inner?.status === 404 || inner?.code === 'NOT_FOUND') return null;
        throw inner;
      }
    }
    throw err;
  }
}

export async function startTransportTrip(payload) {
  if (isTransportFixtureMode()) return fixtureStartTrip(payload);
  return trackingFetch('/tracking/trips/start', { method: 'POST', body: payload });
}

export async function completeTransportTrip(tripId, payload = {}) {
  if (isTransportFixtureMode()) {
    return { id: tripId, status: 'completed', completedAt: new Date().toISOString() };
  }
  return trackingFetch(`/tracking/trips/${tripId}/complete`, { method: 'POST', body: payload });
}

/** Spec: ≥3s between accepted GPS updates per vehicle (FULL_BACKEND_API_CONTRACT). */
export const LOCATION_UPDATE_MIN_INTERVAL_MS = 3000;

const lastClientPublishMsByVehicle = new Map();

function locationVehicleKey(payload) {
  return String(payload?.vehicle_id || payload?.vehicleId || '_default');
}

function softThrottledLocationResult(vehicleId, retryAfterMs, extra = {}) {
  return {
    accepted: false,
    reason: 'throttled',
    vehicleId,
    vehicle_id: vehicleId,
    retryAfterMs,
    message: 'Location updates are rate-limited to once every 3 seconds',
    ...extra,
  };
}

/**
 * Publish driver GPS. Client-throttles to ≤1 post / 3s per vehicle and treats
 * server throttle / legacy RATE_LIMITED as soft success so tracking loops continue.
 */
export async function updateDriverLocation(payload) {
  const vehicleId = locationVehicleKey(payload);
  const now = Date.now();
  const prev = lastClientPublishMsByVehicle.get(vehicleId) || 0;
  const elapsed = now - prev;
  if (prev > 0 && elapsed < LOCATION_UPDATE_MIN_INTERVAL_MS) {
    return softThrottledLocationResult(vehicleId, LOCATION_UPDATE_MIN_INTERVAL_MS - elapsed, {
      clientThrottled: true,
    });
  }

  if (isTransportFixtureMode()) {
    lastClientPublishMsByVehicle.set(vehicleId, now);
    return { ok: true, accepted: true, acceptedAt: new Date().toISOString(), ...payload };
  }

  try {
    const result = await trackingFetch('/tracking/update-location', { method: 'POST', body: payload });
    if (result && result.accepted === false) {
      return result;
    }
    lastClientPublishMsByVehicle.set(vehicleId, Date.now());
    return result && typeof result === 'object'
      ? { accepted: true, ...result }
      : { accepted: true, data: result };
  } catch (err) {
    // Legacy hard 429 / RATE_LIMITED — swallow so UI does not toast or stop GPS.
    if (err?.status === 429 || err?.code === 'RATE_LIMITED') {
      return softThrottledLocationResult(vehicleId, LOCATION_UPDATE_MIN_INTERVAL_MS, {
        message: err.message || 'Location updates are rate-limited to once every 3 seconds',
      });
    }
    throw err;
  }
}

/** Alias used by docs / mobile naming. */
export async function publishDriverLocation(payload) {
  return updateDriverLocation(payload);
}

export async function registerGpsDevice(payload) {
  if (isTransportFixtureMode()) {
    const token = payload.deviceToken || `fixture-token-${Date.now().toString(36)}`;
    return {
      id: `fixture-gps-${Date.now()}`,
      vehicleId: payload.vehicleId,
      imei: payload.imei,
      provider: payload.provider || 'generic',
      status: 'active',
      deviceToken: token,
    };
  }
  const result = await trackingFetch('/admin/transport/gps-devices', {
    method: 'POST',
    body: payload,
  });
  return normalizeGpsDevice(result) || result;
}

export async function fetchTripHistory(params = {}) {
  if (isTransportFixtureMode()) return [];
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') qs.set(key, value);
  });
  const suffix = qs.toString() ? `?${qs}` : '';
  try {
    const data = await trackingFetch(`/admin/transport/trips${suffix}`);
    return asList(data);
  } catch (err) {
    if (err?.status === 404 || err?.code === 'NOT_FOUND') return [];
    throw err;
  }
}

/** Admin/Driver: students assigned to a trip stop (keyed by stopId). */
export async function getTripStopStudents(tripId, stopId) {
  if (!tripId || !stopId) {
    return normalizeTripStopStudentsPayload({ tripId, stop: { stopId }, students: [] });
  }
  if (isTransportFixtureMode()) {
    return normalizeTripStopStudentsPayload(fixtureTripStopStudents(tripId, stopId));
  }
  try {
    const data = await trackingFetch(
      `/transport/trips/${encodeURIComponent(tripId)}/stops/${encodeURIComponent(stopId)}/students`,
    );
    return normalizeTripStopStudentsPayload(data);
  } catch (err) {
    if (err?.status === 404 || err?.code === 'NOT_FOUND') {
      return normalizeTripStopStudentsPayload({
        tripId,
        stop: { stopId },
        students: [],
      });
    }
    throw err;
  }
}

/** Driver: mark pickup at a stop. */
export async function markStudentPickup({
  tripId,
  studentId,
  stopId,
  status = 'PICKED_UP',
  deviceTimestamp,
}) {
  if (isTransportFixtureMode()) {
    return fixtureMarkStudentPickup({ tripId, studentId, stopId, status });
  }
  return trackingFetch(
    `/tracking/trips/${encodeURIComponent(tripId)}/students/${encodeURIComponent(studentId)}/pickup`,
    {
      method: 'POST',
      body: {
        stopId,
        status,
        deviceTimestamp: deviceTimestamp || new Date().toISOString(),
      },
    },
  );
}

/** Driver: mark dropoff at a stop. */
export async function markStudentDropoff({
  tripId,
  studentId,
  stopId,
  status = 'DROPPED_OFF',
  deviceTimestamp,
}) {
  if (isTransportFixtureMode()) {
    return fixtureMarkStudentDropoff({ tripId, studentId, stopId, status });
  }
  return trackingFetch(
    `/tracking/trips/${encodeURIComponent(tripId)}/students/${encodeURIComponent(studentId)}/dropoff`,
    {
      method: 'POST',
      body: {
        stopId,
        status,
        deviceTimestamp: deviceTimestamp || new Date().toISOString(),
      },
    },
  );
}

/** Parent: own child trip pickup/dropoff + approval status. */
export async function getParentStudentTripStatus(tripId, studentId) {
  if (!tripId || !studentId) return null;
  if (isTransportFixtureMode()) {
    return normalizeParentStudentTripStatus(fixtureParentStudentTripStatus(tripId, studentId));
  }
  try {
    const data = await trackingFetch(
      `/parent/transport/trips/${encodeURIComponent(tripId)}/students/${encodeURIComponent(studentId)}/status`,
    );
    return normalizeParentStudentTripStatus(data);
  } catch (err) {
    if (err?.status === 404 || err?.code === 'NOT_FOUND') return null;
    throw err;
  }
}

/** Parent: approve or reject pickup. */
export async function approveStudentPickup({
  tripId,
  studentId,
  approved,
  reason,
  comment,
}) {
  if (isTransportFixtureMode()) {
    return fixtureApproveStudentPickup({ tripId, studentId, approved, reason });
  }
  const body = { approved: Boolean(approved) };
  if (!approved && reason) body.reason = reason;
  if (!approved && comment) body.comment = comment;
  return trackingFetch(
    `/parent/transport/trips/${encodeURIComponent(tripId)}/students/${encodeURIComponent(studentId)}/pickup/approval`,
    { method: 'POST', body },
  );
}

/** Parent: approve or reject dropoff. */
export async function approveStudentDropoff({
  tripId,
  studentId,
  approved,
  reason,
  comment,
}) {
  if (isTransportFixtureMode()) {
    return fixtureApproveStudentDropoff({ tripId, studentId, approved, reason });
  }
  const body = { approved: Boolean(approved) };
  if (!approved && reason) body.reason = reason;
  if (!approved && comment) body.comment = comment;
  return trackingFetch(
    `/parent/transport/trips/${encodeURIComponent(tripId)}/students/${encodeURIComponent(studentId)}/dropoff/approval`,
    { method: 'POST', body },
  );
}

/** Admin optional: all student transport statuses for a trip. */
export async function getTripStudentTransportStatuses(tripId) {
  if (!tripId) return [];
  if (isTransportFixtureMode()) {
    return fixtureTripStudentTransportStatuses(tripId)
      .map(normalizeStopAssignedStudent)
      .filter(Boolean);
  }
  try {
    const data = await trackingFetch(
      `/admin/transport/trips/${encodeURIComponent(tripId)}/student-transport-statuses`,
    );
    return asList(data).map(normalizeStopAssignedStudent).filter(Boolean);
  } catch (err) {
    if (err?.status === 404 || err?.code === 'NOT_FOUND') return [];
    throw err;
  }
}

/** WebSocket URL derived from the same Spring Boot host as VITE_API_URL. */
export function getTrackingWebSocketUrl({ vehicleId } = {}) {
  if (isTransportFixtureMode()) {
    // Fixture mode has no live WS — callers should no-op when URL is empty.
    return '';
  }
  const api = trackingApiBase().replace(/\/api\/v1\/?$/, '');
  const wsBase = `${api.replace(/^http/, 'ws')}/ws/tracking`;
  const token = getAccessToken();
  const tenantSlug = resolveTenantSlug();
  const url = new URL(wsBase.includes('://') ? wsBase : `${window.location.origin}${wsBase}`);
  if (token) url.searchParams.set('token', token);
  if (tenantSlug) {
    url.searchParams.set('tenant', tenantSlug);
    url.searchParams.set(TENANT_HEADER, tenantSlug);
  }
  if (vehicleId) url.searchParams.set('vehicleId', vehicleId);
  return url.toString();
}

export { isTransportFixtureMode };
