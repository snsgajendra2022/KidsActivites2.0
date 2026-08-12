import { useState } from 'react';
import Button from '../ui/Button.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';
import {
  formatActionStatus,
  formatApprovalStatus,
  formatMarkedAt,
  PARENT_APPROVAL_STATUS,
  REJECTION_REASON_OPTIONS,
  STUDENT_ACTION_STATUS,
} from '../../utils/transportStudentAttendance.js';

/**
 * Parent card: child's pickup/dropoff status + Yes Confirm / No Report Issue.
 */
export default function ParentTransportApprovalCard({
  status,
  studentName,
  loading = false,
  submitting = false,
  onApprovePickup,
  onRejectPickup,
  onApproveDropoff,
  onRejectDropoff,
}) {
  const [rejectMode, setRejectMode] = useState(null); // 'pickup' | 'dropoff' | null
  const [reason, setReason] = useState(REJECTION_REASON_OPTIONS[0].value);
  const [comment, setComment] = useState('');

  if (loading) {
    return (
      <div className="sb-card p-5">
        <p className="text-sm text-[#667085]">Loading pickup / drop-off status…</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="sb-card p-5">
        <h3 className="font-bold text-[#0b1c30]">Pickup / drop-off</h3>
        <p className="mt-2 text-sm text-[#667085]">
          Status will appear when the driver marks your child on this trip.
        </p>
      </div>
    );
  }

  const name = studentName || status.studentName || 'Your child';
  const pickup = status.pickup || {};
  const dropoff = status.dropoff || {};
  const pickupPendingApproval = pickup.status === STUDENT_ACTION_STATUS.PICKED_UP
    && (!pickup.parentApprovalStatus || pickup.parentApprovalStatus === PARENT_APPROVAL_STATUS.PENDING);
  const dropoffPendingApproval = dropoff.status === STUDENT_ACTION_STATUS.DROPPED_OFF
    && (!dropoff.parentApprovalStatus || dropoff.parentApprovalStatus === PARENT_APPROVAL_STATUS.PENDING);

  const submitReject = async () => {
    if (rejectMode === 'pickup') {
      await onRejectPickup?.({ reason, comment });
    } else if (rejectMode === 'dropoff') {
      await onRejectDropoff?.({ reason, comment });
    }
    setRejectMode(null);
    setComment('');
  };

  return (
    <div className="sb-card p-5 space-y-4">
      <div>
        <h3 className="font-bold text-[#0b1c30]">{name}</h3>
        <p className="mt-1 text-xs text-[#667085]">Pickup and drop-off confirmation</p>
      </div>

      <div className="rounded-xl border border-[#d0d5dd] bg-[#f8f9ff] px-3 py-3 text-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-[#667085]">Pickup status</p>
        <p className="mt-1 font-semibold text-[#0b1c30]">{formatActionStatus(pickup.status)}</p>
        {pickup.markedAt ? (
          <p className="mt-1 text-xs text-[#667085]">
            Marked at {formatMarkedAt(pickup.markedAt)}
            {pickup.stopName ? ` · ${pickup.stopName}` : ''}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-[#475467]">
          Parent confirmation: <strong>{formatApprovalStatus(pickup.parentApprovalStatus)}</strong>
        </p>
      </div>

      {pickupPendingApproval ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-950">
          <p className="font-semibold">
            {name} was marked as picked up
            {pickup.markedAt ? ` at ${formatMarkedAt(pickup.markedAt)}` : ''}.
          </p>
          <p className="mt-1 text-xs">Did this pickup occur correctly?</p>
          {rejectMode === 'pickup' ? (
            <div className="mt-3 space-y-2">
              <Select
                label="Reason"
                value={reason}
                options={REJECTION_REASON_OPTIONS}
                onChange={(event) => setReason(event.target.value)}
              />
              <Textarea
                label="Comment (optional)"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setRejectMode(null)}>Cancel</Button>
                <Button variant="danger" loading={submitting} onClick={() => void submitReject()}>
                  Submit report
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button loading={submitting} onClick={() => void onApprovePickup?.()}>
                Yes, Confirm
              </Button>
              <Button variant="secondary" disabled={submitting} onClick={() => setRejectMode('pickup')}>
                No, Report Issue
              </Button>
            </div>
          )}
        </div>
      ) : null}

      <div className="rounded-xl border border-[#d0d5dd] bg-[#f8f9ff] px-3 py-3 text-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-[#667085]">Drop-off status</p>
        <p className="mt-1 font-semibold text-[#0b1c30]">{formatActionStatus(dropoff.status)}</p>
        {dropoff.markedAt ? (
          <p className="mt-1 text-xs text-[#667085]">
            Marked at {formatMarkedAt(dropoff.markedAt)}
            {dropoff.stopName ? ` · ${dropoff.stopName}` : ''}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-[#475467]">
          Parent confirmation: <strong>{formatApprovalStatus(dropoff.parentApprovalStatus)}</strong>
        </p>
      </div>

      {dropoffPendingApproval ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-950">
          <p className="font-semibold">
            {name} was marked as dropped off
            {dropoff.markedAt ? ` at ${formatMarkedAt(dropoff.markedAt)}` : ''}.
          </p>
          <p className="mt-1 text-xs">Did this drop-off occur correctly?</p>
          {rejectMode === 'dropoff' ? (
            <div className="mt-3 space-y-2">
              <Select
                label="Reason"
                value={reason}
                options={REJECTION_REASON_OPTIONS}
                onChange={(event) => setReason(event.target.value)}
              />
              <Textarea
                label="Comment (optional)"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setRejectMode(null)}>Cancel</Button>
                <Button variant="danger" loading={submitting} onClick={() => void submitReject()}>
                  Submit report
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button loading={submitting} onClick={() => void onApproveDropoff?.()}>
                Yes, Confirm
              </Button>
              <Button variant="secondary" disabled={submitting} onClick={() => setRejectMode('dropoff')}>
                No, Report Issue
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {Array.isArray(status.timeline) && status.timeline.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#667085]">Timeline</p>
          <ol className="space-y-2">
            {status.timeline.map((item, index) => (
              <li key={`${item.at || index}-${item.label}`} className="flex gap-3 text-sm">
                <span className="w-16 shrink-0 text-xs font-semibold text-[#667085]">
                  {item.at ? formatMarkedAt(item.at) : '—'}
                </span>
                <span className="text-[#344054]">{item.label}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
