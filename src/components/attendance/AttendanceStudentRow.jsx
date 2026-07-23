import AttendanceStatusChip, { ATTENDANCE_STATUS_CODES } from './AttendanceStatusChip.jsx';

function formatUpdatedAt(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/**
 * Student row: avatar, name, roll, status chips, note input.
 */
export default function AttendanceStudentRow({
  student,
  statuses = ATTENDANCE_STATUS_CODES,
  canEdit = true,
  onStatusChange,
  onNoteChange,
}) {
  const name = student.studentName || student.name || 'Student';
  const roll = student.rollNumber || student.roll || '—';
  const photoUrl = student.photoUrl;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#e2e5ec] bg-white p-3 sm:p-4 sm:flex-row sm:items-start">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eef2ff] text-sm font-semibold text-[#4338ca]">
          {photoUrl ? (
            <img src={photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#0b1c30]">{name}</p>
          <p className="text-xs text-[#5a6270]">Roll {roll}</p>
          {student.lastUpdatedAt && (
            <p className="mt-0.5 text-[11px] text-[#8a93a3]">
              Updated {formatUpdatedAt(student.lastUpdatedAt)}
            </p>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-[1.4] flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          {canEdit ? (
            statuses.map((code) => {
              const statusCode = typeof code === 'string' ? code : code.code;
              const statusLabel = typeof code === 'string' ? undefined : code.label;
              return (
                <AttendanceStatusChip
                  key={statusCode}
                  status={statusCode}
                  label={statusLabel}
                  interactive
                  selected={student.status === statusCode}
                  onClick={() => onStatusChange?.(student.studentId, statusCode)}
                />
              );
            })
          ) : (
            student.status && <AttendanceStatusChip status={student.status} />
          )}
        </div>
        <input
          type="text"
          className="form-input w-full text-sm"
          placeholder="Note / reason (optional)"
          value={student.note || ''}
          disabled={!canEdit}
          onChange={(e) => onNoteChange?.(student.studentId, e.target.value)}
          aria-label={`Note for ${name}`}
        />
      </div>
    </div>
  );
}
