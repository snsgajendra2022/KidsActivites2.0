import { api, ApiError } from './api/client.js';
import { API_BASE_URL, resolveTenantSlug, TENANT_HEADER } from './api/config.js';
import { getAccessToken } from './api/tokenStorage.js';

function parseContentDispositionFilename(header) {
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)"?/i.exec(header);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1].replace(/['"]/g, '').trim());
  } catch {
    return match[1].replace(/['"]/g, '').trim();
  }
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** GET /attendance/statuses */
export async function getAttendanceStatuses() {
  return api.get('/attendance/statuses');
}

/** GET /attendance/classes?date= */
export async function getAttendanceClasses(date) {
  return api.get('/attendance/classes', { date });
}

/**
 * GET /attendance/session?classId=&sectionId=&date=
 * Returns session + summary + students (may be unsaved defaults).
 */
export async function getAttendanceSession({ classId, sectionId, date }) {
  return api.get('/attendance/session', {
    classId,
    sectionId: sectionId || undefined,
    date,
  });
}

/**
 * PUT /attendance/session
 * @param {{ classId, sectionId?, date, mode: 'DRAFT'|'SUBMITTED', records: Array }} payload
 */
export async function saveAttendanceSession(payload) {
  return api.put('/attendance/session', payload);
}

/** POST /attendance/session/{id}/finalize */
export async function finalizeAttendanceSession(sessionId, { confirm = true, note } = {}) {
  return api.post(`/attendance/session/${sessionId}/finalize`, {
    confirm,
    ...(note !== undefined ? { note } : {}),
  });
}

/** POST /attendance/session/{id}/reopen */
export async function reopenAttendanceSession(sessionId, { reason }) {
  return api.post(`/attendance/session/${sessionId}/reopen`, { reason });
}

/** GET /attendance/students/{id}/history?from=&to= */
export async function getStudentAttendanceHistory(studentId, { from, to } = {}) {
  return api.get(`/attendance/students/${studentId}/history`, { from, to });
}

/** GET /attendance/reports/summary?... */
export async function getAttendanceReportSummary(params = {}) {
  return api.get('/attendance/reports/summary', params);
}

/**
 * GET /attendance/reports/export?format=csv&...
 * Downloads the file via blob (does not use JSON api client).
 */
export async function exportAttendanceReport(params = {}) {
  const query = { format: 'csv', ...params };
  const url = new URL(`${API_BASE_URL}/attendance/reports/export`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const headers = {};
  const tenantSlug = resolveTenantSlug();
  if (tenantSlug) headers[TENANT_HEADER] = tenantSlug;
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url.toString(), { headers });
  } catch (networkErr) {
    const hint = networkErr?.message === 'Failed to fetch'
      ? `Cannot reach the API at ${API_BASE_URL}.`
      : (networkErr?.message || 'Network request failed');
    throw new ApiError(hint, 0, 'NETWORK_ERROR');
  }

  if (!res.ok) {
    const text = await res.text();
    let message = `Export failed (${res.status})`;
    try {
      const json = JSON.parse(text);
      message = json?.error?.message || message;
    } catch {
      if (text) message = text;
    }
    throw new ApiError(message, res.status);
  }

  const blob = await res.blob();
  const filename = parseContentDispositionFilename(res.headers.get('Content-Disposition'))
    || `attendance-report.${query.format === 'xlsx' ? 'xlsx' : 'csv'}`;
  triggerBlobDownload(blob, filename);
  return { filename, size: blob.size };
}

/** GET /attendance/session/{id}/audit-logs */
export async function getAttendanceAuditLogs(sessionId) {
  return api.get(`/attendance/session/${sessionId}/audit-logs`);
}
