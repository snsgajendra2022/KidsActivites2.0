import { X } from 'lucide-react';
import AttendanceStatusChip from './AttendanceStatusChip.jsx';

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatValue(value) {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  if (value.status) return value.status;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Simple modal listing attendance audit logs for a session.
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
              {logs.map((log) => (
                <li
                  key={log.id || `${log.action}-${log.changedAt}-${log.studentId}`}
                  className="rounded-xl border border-[#e8ebf2] bg-[#fafbff] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#0b1c30]">{log.action}</p>
                    <p className="text-xs text-[#8a93a3]">{formatWhen(log.changedAt)}</p>
                  </div>
                  <p className="mt-1 text-sm text-[#45474c]">
                    {log.studentName || log.studentId || 'Session'}
                    {log.changedBy ? ` · by ${log.changedBy}` : ''}
                  </p>
                  {(log.oldValue || log.newValue) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#5a6270]">
                      <span>From {formatValue(log.oldValue)}</span>
                      <span>→</span>
                      {log.newValue?.status ? (
                        <AttendanceStatusChip status={log.newValue.status} />
                      ) : (
                        <span>{formatValue(log.newValue)}</span>
                      )}
                    </div>
                  )}
                  {log.reason && (
                    <p className="mt-1 text-xs italic text-[#5a6270]">Reason: {log.reason}</p>
                  )}
                </li>
              ))}
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
