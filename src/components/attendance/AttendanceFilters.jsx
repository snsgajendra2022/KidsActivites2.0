import Select from '../ui/Select.jsx';

function toClassOption(cls) {
  const section = cls.sectionName ? ` · ${cls.sectionName}` : '';
  const count = cls.studentCount != null ? ` (${cls.studentCount})` : '';
  const status = cls.attendanceStatus ? ` — ${cls.attendanceStatus}` : '';
  return {
    value: `${cls.id}|${cls.sectionId || ''}`,
    label: `${cls.name || 'Class'}${section}${count}${status}`,
  };
}

/**
 * Shared date / class / range filter helpers for attendance screens.
 */
export default function AttendanceFilters({
  mode = 'session',
  date,
  from,
  to,
  classKey,
  classes = [],
  status,
  statusOptions = [],
  onDateChange,
  onFromChange,
  onToChange,
  onClassChange,
  onStatusChange,
  className = '',
  children,
}) {
  const classOptions = classes.map(toClassOption);

  return (
    <div className={`flex flex-wrap items-end gap-3 ${className}`}>
      {mode === 'session' && (
        <div className="form-field">
          <label className="form-label" htmlFor="attendance-date">Date</label>
          <input
            id="attendance-date"
            type="date"
            className="form-input"
            value={date || ''}
            onChange={(e) => onDateChange?.(e.target.value)}
          />
        </div>
      )}

      {mode === 'range' && (
        <>
          <div className="form-field">
            <label className="form-label" htmlFor="attendance-from">From</label>
            <input
              id="attendance-from"
              type="date"
              className="form-input"
              value={from || ''}
              onChange={(e) => onFromChange?.(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="attendance-to">To</label>
            <input
              id="attendance-to"
              type="date"
              className="form-input"
              value={to || ''}
              onChange={(e) => onToChange?.(e.target.value)}
            />
          </div>
        </>
      )}

      {onClassChange && (
        <Select
          id="attendance-class"
          label="Class"
          placeholder="Select class"
          value={classKey || ''}
          options={classOptions}
          onChange={(e) => onClassChange(e.target.value)}
        />
      )}

      {onStatusChange && (
        <Select
          id="attendance-status-filter"
          label="Status"
          placeholder="All statuses"
          value={status || ''}
          options={statusOptions}
          onChange={(e) => onStatusChange(e.target.value)}
        />
      )}

      {children}
    </div>
  );
}

export function parseClassKey(classKey) {
  if (!classKey) return { classId: '', sectionId: '' };
  const [classId, sectionId = ''] = String(classKey).split('|');
  return { classId, sectionId };
}

export function buildClassKey(classId, sectionId) {
  if (!classId) return '';
  return `${classId}|${sectionId || ''}`;
}

export function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function monthStartISODate(reference = new Date()) {
  const d = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
