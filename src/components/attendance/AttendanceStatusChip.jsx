const STATUS_STYLES = {
  PRESENT: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  ABSENT: 'bg-rose-100 text-rose-800 border-rose-200',
  LATE: 'bg-amber-100 text-amber-900 border-amber-200',
  HALF_DAY: 'bg-sky-100 text-sky-800 border-sky-200',
  EXCUSED: 'bg-violet-100 text-violet-800 border-violet-200',
};

const STATUS_LABELS = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  HALF_DAY: 'Half Day',
  EXCUSED: 'Excused',
};

export function getAttendanceStatusLabel(code) {
  return STATUS_LABELS[code] || String(code || '').replace(/_/g, ' ') || '—';
}

export function getAttendanceStatusClass(code) {
  return STATUS_STYLES[code] || 'bg-slate-100 text-slate-700 border-slate-200';
}

/**
 * Colored chip for PRESENT / ABSENT / LATE / HALF_DAY / EXCUSED.
 * When `interactive` and `onClick` are set, renders as a toggle button.
 */
export default function AttendanceStatusChip({
  status,
  label,
  selected = false,
  interactive = false,
  onClick,
  disabled = false,
  className = '',
}) {
  const text = label || getAttendanceStatusLabel(status);
  const colorClass = getAttendanceStatusClass(status);
  const base = `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition ${colorClass}`;
  const selectedClass = selected || !interactive
    ? 'ring-2 ring-offset-1 ring-[var(--sb-primary,#0058be)]/40 opacity-100'
    : 'opacity-60 hover:opacity-100';

  if (interactive) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-pressed={selected}
        className={`${base} ${selectedClass} disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      >
        {text}
      </button>
    );
  }

  return (
    <span className={`${base} ${className}`}>
      {text}
    </span>
  );
}

export const ATTENDANCE_STATUS_CODES = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'EXCUSED'];
