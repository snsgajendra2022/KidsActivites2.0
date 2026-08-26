import { X } from 'lucide-react';
import AttendanceStatusChip, {
  getAttendanceStatusLabel,
} from './AttendanceStatusChip.jsx';

const ACTION_LABELS = {
  EVENT_UPDATED: 'Status updated',
  EVENT_CREATED: 'Status recorded',
  RECORD_CREATED: 'Attendance marked',
  RECORD_UPDATED: 'Attendance updated',
  RECORD_DELETED: 'Attendance removed',
  SESSION_CREATED: 'Session created',
  SESSION_SUBMITTED: 'Session submitted',
  SESSION_FINALIZED: 'Session finalized',
  SESSION_REOPENED: 'Session reopened',
  SESSION_UPDATED: 'Session updated',
};

const SESSION_STATUS_LABELS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  FINALIZED: 'Finalized',
  REOPENED: 'Reopened',
};

const ATTENDANCE_STATUSES = new Set([
  'PRESENT',
  'ABSENT',
  'LATE',
  'EARLY_LEAVE',
  'HALF_DAY',
  'EXCUSED',
]);

const SESSION_STATUSES = new Set(Object.keys(SESSION_STATUS_LABELS));

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function looksLikeUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(String(value || '').trim());
}

function looksLikeAppId(value) {
  return /^app-[a-z0-9]+$/i.test(String(value || '').trim());
}

function titleCaseWords(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseMaybeJson(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if ((trimmed.startsWith('{') && trimmed.endsWith('}'))
    || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

function extractStatusCode(value) {
  const parsed = parseMaybeJson(value);
  if (parsed == null || parsed === '' || parsed === '—') return null;
  if (typeof parsed === 'string') {
    const code = parsed.trim().toUpperCase().replace(/\s+/g, '_');
    if (ATTENDANCE_STATUSES.has(code) || SESSION_STATUSES.has(code)) return code;
    return null;
  }
  if (typeof parsed === 'object') {
    const candidate = parsed.status || parsed.mode || parsed.sessionStatus || parsed.newStatus;
    if (candidate == null) return null;
    return String(candidate).trim().toUpperCase().replace(/\s+/g, '_');
  }
  return null;
}

function describeAuditValue(value) {
  const parsed = parseMaybeJson(value);
  if (parsed == null || parsed === '' || parsed === '—') {
    return { kind: 'empty', text: '—' };
  }

  if (typeof parsed === 'string') {
    const code = parsed.trim().toUpperCase().replace(/\s+/g, '_');
    if (ATTENDANCE_STATUSES.has(code)) {
      return { kind: 'attendance', code, text: getAttendanceStatusLabel(code) };
    }
    if (SESSION_STATUSES.has(code)) {
      return { kind: 'session', code, text: SESSION_STATUS_LABELS[code] };
    }
    return { kind: 'text', text: titleCaseWords(parsed) };
  }

  if (typeof parsed === 'object') {
    const statusCode = extractStatusCode(parsed);
    const recordCount = parsed.recordCount ?? parsed.records ?? parsed.count;
    const parts = [];

    if (statusCode && ATTENDANCE_STATUSES.has(statusCode)) {
      return {
        kind: 'attendance',
        code: statusCode,
        text: getAttendanceStatusLabel(statusCode),
        detail: parsed.note ? String(parsed.note) : null,
      };
    }

    if (statusCode && SESSION_STATUSES.has(statusCode)) {
      parts.push(SESSION_STATUS_LABELS[statusCode]);
    } else if (parsed.mode) {
      parts.push(titleCaseWords(parsed.mode));
    }

    if (recordCount != null && recordCount !== '') {
      const count = Number(recordCount);
      parts.push(`${count} record${count === 1 ? '' : 's'}`);
    }

    if (parsed.reason) parts.push(String(parsed.reason));
    if (parsed.note && !parsed.reason) parts.push(String(parsed.note));

    if (parts.length) {
      return {
        kind: statusCode && SESSION_STATUSES.has(statusCode) ? 'session' : 'text',
        code: statusCode,
        text: parts.join(' · '),
      };
    }

    try {
      return { kind: 'text', text: JSON.stringify(parsed) };
    } catch {
      return { kind: 'text', text: String(parsed) };
    }
  }

  return { kind: 'text', text: String(parsed) };
}

function actionLabel(action) {
  const key = String(action || '').toUpperCase();
  if (ACTION_LABELS[key]) return ACTION_LABELS[key];
  return titleCaseWords(key) || 'Event';
}

function subjectLabel(log) {
  const name = log.studentName
    || log.fullName
    || log.student?.name
    || log.student?.fullName
    || '';
  if (name && !looksLikeUuid(name) && !looksLikeAppId(name)) return name;

  const studentId = log.studentId || log.student?.id || '';
  if (!studentId) return 'Session';
  if (looksLikeUuid(studentId) || looksLikeAppId(studentId)) return 'Student';
  return String(studentId);
}

function actorLabel(log) {
  const name = log.changedByName
    || log.actorName
    || log.userName
    || log.changedByUser?.name
    || log.changedByUser?.fullName
    || log.actor?.name
    || '';
  if (name && !looksLikeUuid(name)) return name;

  const by = log.changedBy || log.actorId || log.userId || '';
  if (!by) return null;
  if (looksLikeUuid(by)) return 'Staff';
  return String(by);
}

function ValueDisplay({ value }) {
  const described = describeAuditValue(value);
  if (described.kind === 'attendance' && described.code) {
    return <AttendanceStatusChip status={described.code} />;
  }
  if (described.kind === 'session' && described.code) {
    return (
      <span className="inline-flex items-center rounded-full border border-[#d7dde8] bg-[#f3f5f9] px-2.5 py-0.5 text-xs font-semibold text-[#334155]">
        {described.text}
      </span>
    );
  }
  return <span className="text-xs font-medium text-[#45474c]">{described.text}</span>;
}

/**
 * Modal listing attendance audit logs for a session — human-readable labels.
 */
export default function AttendanceAuditLogModal({
  open,
  logs = [],
  loading = false,
  error = null,
  onClose,
  title = 'Attendance audit log',
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close overlay"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-[#e8ebf2] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#0b1c30]">{title}</h2>
            <p className="text-sm text-[#5a6270]">
              {loading ? 'Loading…' : `${logs.length} event${logs.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-[#5a6270] hover:bg-[#f3f5f9]"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && <p className="text-sm text-[#5a6270]">Loading audit logs…</p>}
          {!loading && error && (
            <p className="text-sm text-rose-600">{error}</p>
          )}
          {!loading && !error && logs.length === 0 && (
            <p className="text-sm text-[#5a6270]">No audit events for this session.</p>
          )}
          {!loading && !error && logs.length > 0 && (
            <ul className="space-y-3">
              {logs.map((log, index) => {
                const actor = actorLabel(log);
                const subject = subjectLabel(log);
                const oldDescribed = describeAuditValue(log.oldValue);
                const newDescribed = describeAuditValue(log.newValue);
                const hasChange = oldDescribed.kind !== 'empty' || newDescribed.kind !== 'empty';

                return (
                  <li
                    key={log.id || `${log.action}-${log.changedAt}-${log.studentId}-${index}`}
                    className="rounded-xl border border-[#e8ebf2] bg-[#fafbff] p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#0b1c30]">
                        {actionLabel(log.action)}
                      </p>
                      <p className="text-xs text-[#8a93a3]">
                        {formatWhen(log.changedAt || log.createdAt || log.timestamp)}
                      </p>
                    </div>

                    <p className="mt-1 text-sm text-[#45474c]">
                      {subject}
                      {actor ? ` · by ${actor}` : ''}
                    </p>

                    {hasChange ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <ValueDisplay value={log.oldValue} />
                        <span className="text-xs text-[#8a93a3]" aria-hidden>→</span>
                        <ValueDisplay value={log.newValue} />
                      </div>
                    ) : null}

                    {newDescribed.detail ? (
                      <p className="mt-1 text-xs text-[#5a6270]">{newDescribed.detail}</p>
                    ) : null}

                    {log.reason ? (
                      <p className="mt-1 text-xs italic text-[#5a6270]">Reason: {log.reason}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex justify-end border-t border-[#e8ebf2] px-5 py-3">
          <button type="button" className="sb-button-secondary" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
