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
    classId: raw.student?.classId || raw.classId || '',
    sectionId: raw.student?.sectionId || raw.sectionId || '',
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
    classId: item.classId || item.class_id || null,
    sectionId: item.sectionId || item.section_id || null,
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

function pickFirst(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue;
    return value;
  }
  return null;
}

function asNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function asStudentList(raw) {
  if (!raw || typeof raw !== 'object') return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.students)) return raw.students;
  if (Array.isArray(raw.items)) return raw.items;
  if (Array.isArray(raw.rows)) return raw.rows;
  if (Array.isArray(raw.content)) return raw.content;
  if (Array.isArray(raw.data?.students)) return raw.data.students;
  if (Array.isArray(raw.data)) return raw.data;
  return [];
}

function normalizeReportStudentRow(item, index = 0) {
  if (!item || typeof item !== 'object') return null;
  const nested = item.student && typeof item.student === 'object' ? item.student : {};
  const stats = (item.stats && typeof item.stats === 'object' ? item.stats : null)
    || (item.counts && typeof item.counts === 'object' ? item.counts : null)
    || item;

  const studentId = String(pickFirst(
    item.studentId,
    item.student_id,
    nested.id,
    nested.studentId,
    item.id,
  ) || '');
  const studentName = String(pickFirst(
    item.studentName,
    item.student_name,
    item.fullName,
    item.name,
    nested.fullName,
    nested.name,
    nested.studentName,
  ) || '').trim();

  if (!studentId && !studentName) return null;

  const present = asNumber(pickFirst(
    stats.present,
    stats.presentCount,
    stats.presentDays,
    stats.daysPresent,
    item.present,
    item.presentCount,
    item.presentDays,
    item.daysPresent,
  ));
  const absent = asNumber(pickFirst(
    stats.absent,
    stats.absentCount,
    stats.absentDays,
    stats.daysAbsent,
    item.absent,
    item.absentCount,
    item.absentDays,
    item.daysAbsent,
  ));
  const late = asNumber(pickFirst(
    stats.late,
    stats.lateCount,
    stats.lateDays,
    stats.daysLate,
    item.late,
    item.lateCount,
    item.lateDays,
    item.daysLate,
  ));
  const halfDay = asNumber(pickFirst(
    stats.halfDay,
    stats.half_day,
    stats.halfDayCount,
    item.halfDay,
    item.halfDayCount,
  ));
  const excused = asNumber(pickFirst(
    stats.excused,
    stats.excusedCount,
    item.excused,
    item.excusedCount,
  ));
  const percentage = asNumber(pickFirst(
    stats.percentage,
    stats.attendancePercentage,
    stats.averageAttendancePercentage,
    item.percentage,
    item.attendancePercentage,
    item.averageAttendancePercentage,
  ));

  const status = String(pickFirst(
    item.lastStatus,
    item.status,
    item.attendanceStatus,
    item.sessionStatus,
  ) || '').toUpperCase() || null;

  return {
    studentId: studentId || `row-${index}`,
    studentName: studentName || 'Student',
    rollNumber: pickFirst(
      item.rollNumber,
      item.roll_number,
      item.rollNo,
      item.roll,
      nested.rollNumber,
      nested.roll,
    ) || null,
    present,
    absent,
    late,
    halfDay,
    excused,
    percentage,
    lastStatus: status,
    sessionStatus: item.sessionStatus || null,
    sessionId: pickFirst(item.sessionId, item.attendanceSessionId, item.session_id) || null,
    attendanceSessionId: pickFirst(item.attendanceSessionId, item.sessionId) || null,
    classId: pickFirst(item.classId, item.class_id, nested.classId) || null,
    sectionId: pickFirst(item.sectionId, item.section_id, nested.sectionId) || null,
    date: pickFirst(item.date, item.attendanceDate) || null,
    _rawStatus: status,
  };
}

function looksLikeDailyAttendanceRow(row) {
  if (!row) return false;
  const hasAggregate = row.present != null || row.absent != null || row.late != null || row.percentage != null;
  if (hasAggregate) return false;
  return Boolean(row._rawStatus || row.date);
}

function aggregateDailyRows(rows) {
  const byStudent = new Map();

  rows.forEach((row, index) => {
    const key = row.studentId && !String(row.studentId).startsWith('row-')
      ? String(row.studentId)
      : `${row.studentName}::${row.rollNumber || ''}`.toLowerCase();
    const current = byStudent.get(key) || {
      ...row,
      studentId: row.studentId || `agg-${index}`,
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      excused: 0,
      _days: 0,
    };

    const status = String(row._rawStatus || '').toUpperCase();
    current._days += 1;
    if (status === 'PRESENT') current.present += 1;
    else if (status === 'ABSENT') current.absent += 1;
    else if (status === 'LATE') current.late += 1;
    else if (status === 'HALF_DAY') current.halfDay += 1;
    else if (status === 'EXCUSED') current.excused += 1;

    current.rollNumber = current.rollNumber || row.rollNumber;
    current.classId = current.classId || row.classId;
    current.sectionId = current.sectionId || row.sectionId;
    current.sessionId = current.sessionId || row.sessionId;
    current.attendanceSessionId = current.attendanceSessionId || row.attendanceSessionId;
    current.lastStatus = row._rawStatus || current.lastStatus;
    current.date = row.date || current.date;
    byStudent.set(key, current);
  });

  return [...byStudent.values()].map((row) => {
    const attended = (row.present || 0) + (row.late || 0) + (row.halfDay || 0) + (row.excused || 0);
    const total = row._days || 0;
    const { _days, _rawStatus, ...rest } = row;
    return {
      ...rest,
      percentage: total ? Number(((attended / total) * 100).toFixed(2)) : null,
    };
  });
}

function dedupeStudentRows(rows) {
  const byStudent = new Map();
  rows.forEach((row, index) => {
    const key = row.studentId && !String(row.studentId).startsWith('row-')
      ? String(row.studentId)
      : `${row.studentName}::${row.rollNumber || ''}`.toLowerCase() || `idx-${index}`;
    const existing = byStudent.get(key);
    if (!existing) {
      byStudent.set(key, row);
      return;
    }
    // Prefer the row that already has counts / roll / session metadata
    const score = (r) => (
      (r.present != null ? 2 : 0)
      + (r.rollNumber ? 1 : 0)
      + (r.sessionId || r.attendanceSessionId ? 1 : 0)
      + (r.classId ? 1 : 0)
    );
    if (score(row) >= score(existing)) byStudent.set(key, { ...existing, ...row });
  });
  return [...byStudent.values()];
}

function normalizeReportSummaryBlock(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw.summary && typeof raw.summary === 'object' ? raw.summary : raw;
  return {
    ...source,
    totalStudents: asNumber(pickFirst(source.totalStudents, source.total_students, source.students)) ?? undefined,
    totalAttendanceDays: asNumber(pickFirst(
      source.totalAttendanceDays,
      source.total_attendance_days,
      source.totalDays,
      source.total,
    )) ?? undefined,
    present: asNumber(pickFirst(source.present, source.presentCount)) ?? undefined,
    absent: asNumber(pickFirst(source.absent, source.absentCount)) ?? undefined,
    late: asNumber(pickFirst(source.late, source.lateCount)) ?? undefined,
    halfDay: asNumber(pickFirst(source.halfDay, source.half_day, source.halfDayCount)) ?? undefined,
    excused: asNumber(pickFirst(source.excused, source.excusedCount)) ?? undefined,
    averageAttendancePercentage: asNumber(pickFirst(
      source.averageAttendancePercentage,
      source.percentage,
      source.attendancePercentage,
    )) ?? undefined,
    percentage: asNumber(pickFirst(
      source.percentage,
      source.averageAttendancePercentage,
      source.attendancePercentage,
    )) ?? undefined,
  };
}

/**
 * Normalize live / partial report payloads into the dashboard contract:
 * { summary, students: [{ studentId, studentName, rollNumber, present, absent, late, percentage, ... }] }
 */
export function normalizeAttendanceReportSummary(raw) {
  if (!raw || typeof raw !== 'object') {
    return { summary: null, students: [] };
  }

  let rows = asStudentList(raw).map(normalizeReportStudentRow).filter(Boolean);
  if (!rows.length && Array.isArray(raw.sessions)) {
    // Some backends nest student rows under sessions
    rows = raw.sessions.flatMap((session, sIdx) => (
      asStudentList(session).map((item, index) => normalizeReportStudentRow({
        ...item,
        classId: item.classId || session.classId,
        sectionId: item.sectionId || session.sectionId,
        sessionId: item.sessionId || session.id || session.sessionId,
        date: item.date || session.date,
      }, `${sIdx}-${index}`))
    )).filter(Boolean);
  }

  const daily = rows.length > 0 && rows.every(looksLikeDailyAttendanceRow);
  const students = daily ? aggregateDailyRows(rows) : dedupeStudentRows(rows);

  return {
    summary: normalizeReportSummaryBlock(raw),
    students,
  };
}

/** GET /attendance/reports/summary?... */
export async function getAttendanceReportSummary(params = {}) {
  const data = await api.get('/attendance/reports/summary', params);
  return normalizeAttendanceReportSummary(data);
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
  const data = await api.get(`/attendance/session/${sessionId}/audit-logs`);
  return normalizeAttendanceAuditLogs(data);
}

function asAuditList(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.logs)) return raw.logs;
  if (Array.isArray(raw?.content)) return raw.content;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
}

/** Normalize audit log payloads from varied backend shapes. */
export function normalizeAttendanceAuditLogs(raw) {
  return asAuditList(raw).map((item, index) => {
    if (!item || typeof item !== 'object') return null;
    const changedByUser = item.changedByUser && typeof item.changedByUser === 'object'
      ? item.changedByUser
      : (item.actor && typeof item.actor === 'object' ? item.actor : null);
    const student = item.student && typeof item.student === 'object' ? item.student : null;

    return {
      ...item,
      id: item.id || item.logId || `audit-${index}`,
      action: String(item.action || item.eventType || item.type || '').toUpperCase(),
      studentId: item.studentId || item.student_id || student?.id || null,
      studentName: item.studentName
        || item.student_name
        || student?.name
        || student?.fullName
        || null,
      oldValue: item.oldValue ?? item.old_value ?? item.before ?? null,
      newValue: item.newValue ?? item.new_value ?? item.after ?? null,
      changedAt: item.changedAt || item.changed_at || item.createdAt || item.timestamp || null,
      changedBy: item.changedBy || item.changed_by || item.actorId || item.userId || null,
      changedByName: item.changedByName
        || item.changed_by_name
        || item.actorName
        || item.userName
        || changedByUser?.name
        || changedByUser?.fullName
        || null,
      reason: item.reason || item.note || null,
    };
  }).filter(Boolean);
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
