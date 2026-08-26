import AttendanceStatusChip, { ATTENDANCE_STATUS_CODES } from './AttendanceStatusChip.jsx';
import {
  composeAttendanceNote,
  getAttendanceNoteChips,
  parseAttendanceNote,
} from '../../services/attendanceService.js';

function formatUpdatedAt(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/**
 * Student row: avatar, name, roll, status chips, polished note display.
 */
export default function AttendanceStudentRow({
  student,
  statuses = ATTENDANCE_STATUS_CODES,
  canEdit = true,
  highlighted = false,
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

  const parsed = parseAttendanceNote(student.note);
  const noteChips = getAttendanceNoteChips(student.note);
  const editableNote = parsed.hasTags ? parsed.freeText : (student.note || '');

  const handleNoteInput = (value) => {
    if (parsed.hasTags) {
      onNoteChange?.(student.studentId, composeAttendanceNote(student.note, value));
      return;
    }
    onNoteChange?.(student.studentId, value);
  };

  return (
    <div
      id={student.studentId ? `attendance-student-${student.studentId}` : undefined}
      className={`flex flex-col gap-3 rounded-xl border bg-white p-3 sm:p-4 sm:flex-row sm:items-start ${
        highlighted
          ? 'border-[#0058be] ring-2 ring-[#c7d7f5]'
          : 'border-[#e2e5ec]'
      }`}
    >
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

        {noteChips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5" aria-label={`Attendance source for ${name}`}>
            {noteChips.map((chip) => (
              <span
                key={chip.key}
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                  chip.key === 'mode'
                    ? 'border-[#c7d7f5] bg-[#eef5ff] text-[#0058be]'
                    : chip.key === 'device'
                      ? 'border-[#e5e8ef] bg-[#f5f7fb] text-[#5a6270]'
                      : 'border-[#e8ebf2] bg-white text-[#5a6270]'
                }`}
              >
                {chip.key === 'device' ? `Device ${chip.label}` : chip.label}
              </span>
            ))}
          </div>
        ) : null}

        {parsed.freeText && !canEdit ? (
          <p className="text-sm text-[#5a6270]">{parsed.freeText}</p>
        ) : null}

        {canEdit ? (
          <input
            type="text"
            className="form-input w-full text-sm"
            placeholder={
              parsed.hasTags
                ? 'Add a teacher note (optional)'
                : 'Note / reason (optional)'
            }
            value={editableNote}
            onChange={(e) => handleNoteInput(e.target.value)}
            aria-label={`Note for ${name}`}
          />
        ) : !noteChips.length && student.note ? (
          <p className="text-sm text-[#5a6270]">{student.note}</p>
        ) : null}
      </div>
    </div>
  );
}
