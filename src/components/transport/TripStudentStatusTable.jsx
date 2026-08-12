import {
  formatActionStatus,
  formatApprovalStatus,
  formatMarkedAt,
} from '../../utils/transportStudentAttendance.js';

/**
 * Admin trip-wide student transport status table.
 */
export default function TripStudentStatusTable({
  students = [],
  loading = false,
  emptyText = 'No student transport statuses for this trip yet.',
}) {
  if (loading) {
    return <p className="text-sm text-[#667085]">Loading student statuses…</p>;
  }

  if (!students.length) {
    return (
      <p className="rounded-lg border border-dashed border-[#c5c6cd] bg-[#f8f9ff] px-3 py-3 text-sm text-[#667085]">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#eaecf0] text-xs uppercase tracking-wide text-[#667085]">
            <th className="px-2 py-2 font-bold">Student</th>
            <th className="px-2 py-2 font-bold">Stop</th>
            <th className="px-2 py-2 font-bold">Pickup</th>
            <th className="px-2 py-2 font-bold">Parent</th>
            <th className="px-2 py-2 font-bold">Drop-off</th>
            <th className="px-2 py-2 font-bold">Parent</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const pickup = student.pickup || {};
            const dropoff = student.dropoff || {};
            return (
              <tr key={student.studentId} className="border-b border-[#f2f4f7]">
                <td className="px-2 py-2">
                  <p className="font-semibold text-[#0b1c30]">{student.studentName}</p>
                  <p className="text-xs text-[#667085]">{student.className || '—'}</p>
                </td>
                <td className="px-2 py-2 text-[#344054]">{student.stopName || '—'}</td>
                <td className="px-2 py-2">
                  <p>{formatActionStatus(pickup.status)}</p>
                  {pickup.markedAt ? (
                    <p className="text-xs text-[#667085]">{formatMarkedAt(pickup.markedAt)}</p>
                  ) : null}
                </td>
                <td className="px-2 py-2">{formatApprovalStatus(pickup.parentApprovalStatus)}</td>
                <td className="px-2 py-2">
                  <p>{formatActionStatus(dropoff.status)}</p>
                  {dropoff.markedAt ? (
                    <p className="text-xs text-[#667085]">{formatMarkedAt(dropoff.markedAt)}</p>
                  ) : null}
                </td>
                <td className="px-2 py-2">{formatApprovalStatus(dropoff.parentApprovalStatus)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
