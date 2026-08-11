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
  const data = await api.get(`/attendance/students/${studentId}/history`, { from, to });
  return normalizeStudentAttendanceHistory(data);
}

/**
 * Live API may return flat fields (studentId, studentName, days[]) instead of
 * the nested { student, records } contract. Normalize for the history UI.
 */
export function normalizeStudentAttendanceHistory(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const recordsSource = Array.isArray(raw.records) && raw.records.length
    ? raw.records
    : (Array.isArray(raw.days) ? raw.days : []);

  const records = recordsSource
    .map((item) => normalizeHistoryRecord(item))
    .filter(Boolean)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const student = {
    id: raw.student?.id || raw.studentId || '',
    name: raw.student?.name || raw.studentName || '',
    className: raw.student?.className || raw.className || '',
    sectionName: raw.student?.sectionName || raw.sectionName || '',
  };

  const summary = raw.summary
    ? {
        ...raw.summary,
        total: raw.summary.total ?? raw.summary.totalDays ?? records.length,
        totalDays: raw.summary.totalDays ?? raw.summary.total ?? records.length,
      }
    : null;

  return {
    ...raw,
    student,
    summary,
    records,
    from: raw.from || null,
    to: raw.to || null,
  };
}

function normalizeHistoryRecord(item) {
  if (!item || typeof item !== 'object') return null;
  const date = item.date || item.attendanceDate || '';
  if (!date) return null;
  return {
    ...item,
    date,
    status: String(item.status || '').toUpperCase(),
    note: item.note || '',
    recordId: item.recordId || item.id || null,
    sessionId: item.sessionId || null,
    classId: item.classId || null,
    markedAt: item.markedAt || item.updatedAt || item.createdAt || null,
    displayNote: formatAttendanceNote(item.note),
  };
}

/** Mode labels for tagged attendance notes from advanced capture. */
const ATTENDANCE_MODE_LABELS = {
  daily: 'Daily',
  period: 'Period',
  late: 'Late entry',
  early: 'Early leave',
  qr: 'QR',
  rfid: 'RFID',
  face: 'Face',
};

/**
 * Parse tagged notes like `[mode=period][period=1][time=09:15] optional text`.
 */
export function parseAttendanceNote(note) {
  const raw = String(note || '');
  const tags = {};
  const tagRe = /\[([^=\]]+)=([^\]]*)\]/g;
  let match;
  let lastIndex = 0;
  while ((match = tagRe.exec(raw)) !== null) {
    tags[String(match[1]).trim().toLowerCase()] = String(match[2]).trim();
    lastIndex = tagRe.lastIndex;
  }

  const prefix = lastIndex > 0 ? raw.slice(0, lastIndex).trim() : '';
  let freeText = raw.slice(lastIndex).trim();
  const deviceEventId = tags.deviceeventid || tags.deviceEventId || '';
  // Hide free text when it only repeats the device event id (common for QR/RFID/face).
  if (freeText && deviceEventId) {
    const deviceRoot = String(deviceEventId).split(':')[0];
    if (freeText === deviceEventId || freeText === deviceRoot) {
      freeText = '';
    }
  }

  return {
    tags,
    prefix,
    freeText,
    hasTags: Object.keys(tags).length > 0,
  };
}

/** Build chips for UI: [{ key, label }]. */
export function getAttendanceNoteChips(note) {
  const { tags, hasTags } = parseAttendanceNote(note);
  if (!hasTags) return [];

  const chips = [];
  const modeKey = String(tags.mode || '').toLowerCase();
  if (modeKey) {
    const modeLabel = ATTENDANCE_MODE_LABELS[modeKey]
      || modeKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    if (modeKey === 'period' && tags.period) {
      chips.push({ key: 'mode', label: `${modeLabel} ${tags.period}` });
    } else {
      chips.push({ key: 'mode', label: modeLabel });
    }
  } else if (tags.period) {
    chips.push({ key: 'period', label: `Period ${tags.period}` });
  }

  if (tags.time) {
    chips.push({ key: 'time', label: tags.time });
  }

  const deviceEventId = tags.deviceeventid || '';
  if (deviceEventId) {
    const shortId = String(deviceEventId).split(':')[0];
    chips.push({ key: 'device', label: shortId });
  }

  return chips;
}

/**
 * Turn "[mode=period][period=1][time=09:15]" into "Period 1 · 09:15".
 * Device ids are shortened; duplicate free-text device refs are omitted.
 */
export function formatAttendanceNote(note) {
  const { tags, freeText, hasTags } = parseAttendanceNote(note);
  if (!hasTags) return String(note || '').trim();

  const chips = getAttendanceNoteChips(note);
  const parts = chips.map((chip) => chip.label);
  if (freeText) parts.push(freeText);
  return parts.join(' · ');
}

/** Keep system tags when the teacher edits only the human note portion. */
export function composeAttendanceNote(existingNote, freeText) {
  const { prefix, hasTags } = parseAttendanceNote(existingNote);
  const text = String(freeText || '').trim();
  if (hasTags && prefix) {
    return text ? `${prefix} ${text}` : prefix;
  }
  return text;
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

/**
 * POST /admin/attendance/events
 * Advanced attendance: period / late / early / QR / RFID / face events.
 */
export async function saveAttendanceEvent(payload) {
  return api.post('/admin/attendance/events', payload);
}

/**
 * Save one attendance event for many students.
 * Prefers studentIds[] on a single request; falls back to one request per student.
 */
export async function saveAttendanceEventsForStudents(basePayload, studentIds = []) {
  const ids = [...new Set((studentIds || []).map(String).filter(Boolean))];
  if (!ids.length) {
    throw new Error('Select at least one student.');
  }

  // Prefer bulk payload when backend supports it
  if (ids.length > 1) {
    try {
      return await api.post('/admin/attendance/events', {
        ...basePayload,
        studentIds: ids,
        studentId: undefined,
      });
    } catch (err) {
      const status = Number(err?.status || 0);
      if (![400, 404, 405, 422].includes(status)) throw err;
    }
  }

  const results = [];
  const errors = [];
  for (const studentId of ids) {
    try {
      // Device modes need unique event ids per student when shared note is used
      const deviceEventId = basePayload.deviceEventId
        ? `${basePayload.deviceEventId}:${studentId}`
        : undefined;
      const data = await saveAttendanceEvent({
        ...basePayload,
        studentId,
        studentIds: undefined,
        deviceEventId: deviceEventId || basePayload.deviceEventId,
      });
      results.push({ studentId, data });
    } catch (err) {
      errors.push({ studentId, message: err?.message || 'Failed' });
    }
  }

  if (!results.length) {
    throw new Error(errors[0]?.message || 'Unable to save attendance events.');
  }

  return {
    savedCount: results.length,
    failedCount: errors.length,
    results,
    errors,
    message: errors.length
      ? `Saved for ${results.length} student(s); ${errors.length} failed.`
      : `Attendance recorded for ${results.length} student(s).`,
  };
}

/** GET /admin/attendance/reports — optional advanced reports feed */
export async function getAdvancedAttendanceReports(params = {}) {
  return api.get('/admin/attendance/reports', params);
}
