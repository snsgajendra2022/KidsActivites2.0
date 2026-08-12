import {
  formatActionStatus,
  formatApprovalStatus,
  formatMarkedAt,
  isDropoffDirection,
  isPickupDirection,
  isTerminalDriverStatus,
} from '../../utils/transportStudentAttendance.js';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';

/**
 * Stop details + assigned students.
 * Viewer: admin | driver | parent (parent list already privacy-filtered by caller).
 */
export default function StopDetailsModal({
  open,
  onClose,
  stop,
  students = [],
  counts = null,
  direction = 'morning',
  routeName = '',
  loading = false,
  error = '',
  viewerRole = 'admin',
  /** Driver actions */
  canMark = false,
  markingStudentId = null,
  onMarkPickup,
  onMarkDropoff,
  onMarkAll,
}) {
  if (!open) return null;

  const pickupMode = isPickupDirection(direction) && !isDropoffDirection(direction);
  const dropoffMode = isDropoffDirection(direction);
  const seq = stop?.displaySequence ?? stop?.sequence;
  const title = seq != null
    ? `Stop ${seq} — ${stop?.name || stop?.stopName || 'Stop'}`
    : (stop?.name || stop?.stopName || 'Stop details');

  const summary = counts || {
    assignedStudentCount: students.length,
    pickedUpCount: 0,
    droppedOffCount: 0,
    pendingCount: students.length,
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          {routeName ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#667085]">Route</p>
              <p className="mt-0.5 font-semibold text-[#0b1c30]">{routeName}</p>
            </div>
          ) : null}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#667085]">Direction</p>
            <p className="mt-0.5 font-semibold text-[#0b1c30]">
              {dropoffMode ? 'Drop-off' : pickupMode ? 'Pickup' : String(direction || '—')}
            </p>
          </div>
          {Number.isFinite(Number(stop?.distanceFromBusKm)) ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#667085]">Distance from bus</p>
              <p className="mt-0.5 font-semibold text-[#0b1c30]">
                {Number(stop.distanceFromBusKm).toFixed(2)} km
              </p>
            </div>
          ) : null}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#667085]">Students</p>
            <p className="mt-0.5 font-semibold text-[#0b1c30]">
              {summary.assignedStudentCount}
              {dropoffMode
                ? ` · ${summary.droppedOffCount} dropped · ${summary.pendingCount} pending`
                : ` · ${summary.pickedUpCount} picked up · ${summary.pendingCount} pending`}
            </p>
          </div>
        </div>

        {viewerRole === 'parent' ? (
          <p className="rounded-lg border border-[#d0d5dd] bg-[#f8f9ff] px-3 py-2 text-xs text-[#475467]">
            Only your linked children at this stop are shown.
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[#667085]">Loading students…</p>
        ) : error ? (
          <p className="text-sm text-[#b42318]">{error}</p>
        ) : students.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#c5c6cd] bg-[#f8f9ff] px-3 py-3 text-sm text-[#667085]">
            {viewerRole === 'parent'
              ? 'None of your children are assigned to this stop.'
              : 'No students assigned to this stop.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {students.map((student) => {
              const pickup = student.pickup || {};
              const dropoff = student.dropoff || {};
              const busy = markingStudentId === student.studentId;
              const pickupDone = isTerminalDriverStatus(pickup.status, 'pickup');
              const dropoffDone = isTerminalDriverStatus(dropoff.status, 'dropoff');

              return (
                <li
                  key={student.studentId}
                  className="rounded-xl border border-[#d0d5dd] bg-white px-3 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-[#0b1c30]">{student.studentName}</p>
                      <p className="text-xs text-[#667085]">
                        {[student.className, student.sectionName].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    {viewerRole !== 'parent' && canMark ? (
                      <div className="flex flex-wrap gap-2">
                        {dropoffMode ? (
                          <Button
                            size="sm"
                            disabled={busy || dropoffDone}
                            loading={busy}
                            onClick={() => onMarkDropoff?.(student, 'DROPPED_OFF')}
                          >
                            {dropoffDone ? 'Dropped Off ✓' : 'Dropped Off'}
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              disabled={busy || pickupDone}
                              loading={busy}
                              onClick={() => onMarkPickup?.(student, 'PICKED_UP')}
                            >
                              {pickup.status === 'PICKED_UP' ? 'Picked Up ✓' : 'Picked Up'}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busy || pickupDone}
                              onClick={() => onMarkPickup?.(student, 'NOT_PRESENT')}
                            >
                              Not Present
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busy || pickupDone}
                              onClick={() => onMarkPickup?.(student, 'SKIPPED')}
                            >
                              Skipped
                            </Button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-2 grid gap-1 text-xs text-[#475467] sm:grid-cols-2">
                    {!dropoffMode ? (
                      <>
                        <p>Pickup: <strong>{formatActionStatus(pickup.status)}</strong>
                          {pickup.markedAt ? ` · ${formatMarkedAt(pickup.markedAt)}` : ''}
                        </p>
                        <p>Parent: <strong>{formatApprovalStatus(pickup.parentApprovalStatus)}</strong></p>
                      </>
                    ) : (
                      <>
                        <p>Drop-off: <strong>{formatActionStatus(dropoff.status)}</strong>
                          {dropoff.markedAt ? ` · ${formatMarkedAt(dropoff.markedAt)}` : ''}
                        </p>
                        <p>Parent: <strong>{formatApprovalStatus(dropoff.parentApprovalStatus)}</strong></p>
                      </>
                    )}
                    {viewerRole === 'admin' && !dropoffMode ? (
                      <p className="sm:col-span-2">
                        Drop-off: {formatActionStatus(dropoff.status)}
                        {' · '}
                        Parent: {formatApprovalStatus(dropoff.parentApprovalStatus)}
                      </p>
                    ) : null}
                    {viewerRole === 'admin' && dropoffMode ? (
                      <p className="sm:col-span-2">
                        Pickup: {formatActionStatus(pickup.status)}
                        {' · '}
                        Parent: {formatApprovalStatus(pickup.parentApprovalStatus)}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {canMark && students.length > 1 && onMarkAll ? (
          <Button
            variant="secondary"
            disabled={Boolean(markingStudentId)}
            onClick={() => onMarkAll(dropoffMode ? 'DROPPED_OFF' : 'PICKED_UP')}
          >
            {dropoffMode ? 'Mark all dropped off…' : 'Mark all picked up…'}
          </Button>
        ) : null}
      </div>
    </Modal>
  );
}
