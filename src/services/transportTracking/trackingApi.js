import { API_BASE_URL, resolveTenantSlug, TENANT_HEADER } from '../api/config.js';
import { getAccessToken } from '../api/tokenStorage.js';
import {
  listFromTrackingPayload,
  normalizeAdminFleetVehicle,
  normalizeGpsDevice,
  normalizeParentLiveSnapshot,
} from '../../types/transportModels.js';
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
  assignmentMatchesDirection,
  computeStudentCounts,
  extractStudentRows,
  normalizeParentStudentTripStatus,
  normalizeStopAssignedStudent,
  normalizeTripStopStudentsPayload,
  sameStopId,
} from '../../utils/transportStudentAttendance.js';
import { studentIdFromStop } from '../../utils/transportRouteGeo.js';
import { getStudentForRelationship } from '../studentDirectoryService.js';

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
  return listFromTrackingPayload(data);
}

export async function fetchAdminFleetLive(_status = 'all') {
  if (isTransportFixtureMode()) {
    return (fixtureAdminFleet(_status) || []).map(normalizeAdminFleetVehicle).filter(Boolean);
  }
  // Always request the full fleet. Status is filtered in the UI after
  // normalizing trackingStatus / nested location — `?status=running` on the
  // backend often disagrees with driver GPS pings and would hide the bus.
  try {
    const data = await trackingFetch('/admin/transport/live');
    return asList(data).map(normalizeAdminFleetVehicle).filter(Boolean);
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

/** Soft-null for endpoints a role cannot reach or a backend has not deployed. */
async function tryTrackingGet(path, params) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value != null && value !== '') qs.set(key, value);
  });
  const suffix = qs.toString() ? `?${qs}` : '';
  try {
    return await trackingFetch(`${path}${suffix}`);
  } catch (err) {
    if (err?.status === 404 || err?.status === 403 || err?.code === 'NOT_FOUND') return null;
    throw err;
  }
}

function assignmentMeta(row) {
  const raw = row && typeof row === 'object' ? row : {};
  const route = raw.route && typeof raw.route === 'object' ? raw.route : {};
  const vehicle = raw.vehicle && typeof raw.vehicle === 'object' ? raw.vehicle : {};
  return {
    assignmentId: raw.id || raw.assignmentId || raw.assignment_id || null,
    routeId: raw.routeId || raw.route_id || route.id || null,
    vehicleId: raw.vehicleId || raw.vehicle_id || vehicle.id || null,
    direction: raw.direction || null,
    status: raw.status || null,
  };
}

const INACTIVE_ASSIGNMENT_STATUSES = ['inactive', 'disabled', 'cancelled', 'deleted'];

/**
 * A standing assignment counts for this stop when it targets the same stopId, or
 * when it targets the same student for a student-home stop that has no stopId.
 */
function keepStandingAssignment(student, meta, opts, trustMissingStopId) {
  if (!student?.studentId) return false;
  const matchesStop = student.stopId
    ? sameStopId(student.stopId, opts.stopId)
    : trustMissingStopId;
  const matchesStudent = Boolean(opts.studentId)
    && String(student.studentId) === String(opts.studentId);
  if (!matchesStop && !matchesStudent) return false;
  if (opts.routeId && meta.routeId && String(meta.routeId) !== String(opts.routeId)) return false;
  if (opts.vehicleId && meta.vehicleId && String(meta.vehicleId) !== String(opts.vehicleId)) return false;
  if (INACTIVE_ASSIGNMENT_STATUSES.includes(String(meta.status || 'active').toLowerCase())) return false;
  return assignmentMatchesDirection(opts.direction, meta.direction);
}

function assignmentsToStopStudents(rows, opts, trustMissingStopId) {
  const students = [];
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const student = normalizeStopAssignedStudent(row);
    const meta = assignmentMeta(row);
    if (!keepStandingAssignment(student, meta, opts, trustMissingStopId)) return;
    students.push({
      ...student,
      assignmentId: student.assignmentId || meta.assignmentId,
      stopId: student.stopId || opts.stopId,
    });
  });
  return students;
}

/**
 * Standing assignments for a stop. Tried in role order so admin, driver and
 * parent portals all reach a roster without a trip-scoped endpoint.
 */
async function listAssignedStudentsForStop(opts) {
  const params = { stopId: opts.stopId, status: 'active' };
  if (opts.routeId) params.routeId = opts.routeId;
  if (opts.vehicleId) params.vehicleId = opts.vehicleId;
  if (opts.direction) params.direction = opts.direction;

  const attempts = [
    opts.routeId
      ? {
        path: `/transport/routes/${encodeURIComponent(opts.routeId)}/stops/${encodeURIComponent(opts.stopId)}/students`,
        trustMissingStopId: true,
      }
      : null,
    { path: '/admin/transport/assignments', trustMissingStopId: false },
    { path: '/transport/assignments', trustMissingStopId: false },
  ].filter(Boolean);

  for (const attempt of attempts) {
    const data = await tryTrackingGet(attempt.path, params);
    if (data == null) continue;
    const students = assignmentsToStopStudents(
      extractStudentRows(data),
      opts,
      attempt.trustMissingStopId,
    );
    if (students.length) return students;
  }

  // Student-home stops carry no stopId on the assignment row, so retry the
  // assignment lists filtered by the bound student instead. Rows are re-checked
  // locally because a backend that ignores `studentId` would return the whole list.
  if (opts.studentId) {
    const studentParams = { studentId: opts.studentId, status: 'active' };
    if (opts.routeId) studentParams.routeId = opts.routeId;
    for (const path of ['/admin/transport/assignments', '/transport/assignments']) {
      const data = await tryTrackingGet(path, studentParams);
      if (data == null) continue;
      const students = assignmentsToStopStudents(extractStudentRows(data), opts, true)
        .filter((student) => String(student.studentId) === String(opts.studentId));
      if (students.length) return students;
    }
  }

  return [];
}

/**
 * Last resort for a stop created from a student's home address: bind that one
 * student from the student catalog and overlay this trip's pickup/dropoff state.
 */
async function studentHomeStopRoster({ tripId, stopId, studentId }) {
  const relationship = await getStudentForRelationship(studentId).catch(() => null);
  if (!relationship) return [];

  let attendance = null;
  if (tripId) {
    const statuses = await getTripStudentTransportStatuses(tripId).catch(() => []);
    attendance = statuses.find((item) => String(item.studentId) === String(studentId)) || null;
  }

  const student = normalizeStopAssignedStudent({
    studentId: relationship.studentId,
    studentName: relationship.studentName,
    classId: relationship.classId,
    className: relationship.className,
    sectionId: relationship.sectionId,
    sectionName: relationship.sectionName,
    parentName: relationship.parentName,
    stopId,
    pickup: attendance?.pickup,
    dropoff: attendance?.dropoff,
  });
  return student ? [student] : [];
}

/**
 * Admin/Driver: students at a trip stop.
 *
 * Resolution order: trip roster by stopId → standing assignments by stopId →
 * standing assignments by the stop's bound studentId → the bound student itself.
 * The last two steps exist because a stop created from a student's home address
 * has no assignment row pointing at its id.
 */
export async function getTripStopStudents(tripId, stopId, options = {}) {
  const studentId = options.studentId || studentIdFromStop({ id: stopId });
  const opts = {
    stopId,
    studentId,
    routeId: options.routeId,
    vehicleId: options.vehicleId,
    direction: options.direction,
  };

  if (!stopId) {
    return normalizeTripStopStudentsPayload({ tripId, stop: { stopId }, students: [] }, opts);
  }
  if (isTransportFixtureMode()) {
    return normalizeTripStopStudentsPayload(fixtureTripStopStudents(tripId, stopId), {
      ...opts,
      trustMissingStopId: true,
    });
  }

  if (tripId) {
    const data = await tryTrackingGet(
      `/transport/trips/${encodeURIComponent(tripId)}/stops/${encodeURIComponent(stopId)}/students`,
    );
    if (data != null) {
      const parsed = normalizeTripStopStudentsPayload(data, { ...opts, trustMissingStopId: true });
      if (parsed.students.length) return parsed;
    }
  }

  let students = await listAssignedStudentsForStop(opts);
  if (!students.length && studentId) {
    students = await studentHomeStopRoster({ tripId, stopId, studentId });
  }

  return {
    tripId: tripId || '',
    stop: { stopId, stopName: 'Stop' },
    students,
    counts: computeStudentCounts(students, opts.direction),
  };
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
