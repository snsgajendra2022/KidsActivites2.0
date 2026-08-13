/**
 * Stop-wise student pickup / dropoff helpers (web).
 * Students are always keyed by stopId — never by displaySequence.
 */

export const STUDENT_ACTION_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PICKED_UP: 'PICKED_UP',
  DROPPED_OFF: 'DROPPED_OFF',
  NOT_PRESENT: 'NOT_PRESENT',
  SKIPPED: 'SKIPPED',
  PARENT_CONFIRMED: 'PARENT_CONFIRMED',
  PARENT_REJECTED: 'PARENT_REJECTED',
});

export const PARENT_APPROVAL_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

export const TRANSPORT_ERROR_CODES = Object.freeze({
  STUDENT_NOT_ON_TRIP: 'TRANSPORT_STUDENT_NOT_ON_TRIP',
  STUDENT_NOT_AT_STOP: 'TRANSPORT_STUDENT_NOT_AT_STOP',
  PICKUP_ALREADY_MARKED: 'TRANSPORT_PICKUP_ALREADY_MARKED',
  DROPOFF_ALREADY_MARKED: 'TRANSPORT_DROPOFF_ALREADY_MARKED',
  PICKUP_NOT_MARKED: 'TRANSPORT_PICKUP_NOT_MARKED',
  DROPOFF_NOT_MARKED: 'TRANSPORT_DROPOFF_NOT_MARKED',
  PARENT_NOT_AUTHORIZED: 'TRANSPORT_PARENT_NOT_AUTHORIZED',
  DRIVER_NOT_AUTHORIZED: 'TRANSPORT_DRIVER_NOT_AUTHORIZED',
  PARENT_APPROVAL_ALREADY_SUBMITTED: 'TRANSPORT_PARENT_APPROVAL_ALREADY_SUBMITTED',
});

/** Morning / PICKUP trip → pickup actions only. Evening / DROPOFF → dropoff only. */
export function isPickupDirection(direction) {
  const d = String(direction || '').toLowerCase();
  return d === 'morning' || d === 'pickup' || d === 'am';
}

export function isDropoffDirection(direction) {
  const d = String(direction || '').toLowerCase();
  return d === 'evening' || d === 'dropoff' || d === 'drop' || d === 'pm';
}

export function formatActionStatus(status) {
  if (!status) return 'Pending';
  return String(status).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatApprovalStatus(status) {
  if (!status) return '—';
  return formatActionStatus(status);
}

export function formatMarkedAt(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function asRecord(value) {
  return value && typeof value === 'object' ? value : {};
}

function pickString(...values) {
  for (const value of values) {
    if (value == null || value === '') continue;
    return String(value);
  }
  return undefined;
}

export function sameStopId(left, right) {
  const a = String(left || '').trim();
  const b = String(right || '').trim();
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

export function assignmentMatchesDirection(tripDirection, assignmentDirection) {
  const assigned = String(assignmentDirection || 'both').toLowerCase();
  const trip = String(tripDirection || '').toLowerCase();
  if (!trip || assigned === 'both' || assigned === 'all') return true;
  if (isPickupDirection(trip)) {
    return assigned === 'morning' || assigned === 'pickup' || assigned === 'am' || assigned === 'both';
  }
  if (isDropoffDirection(trip)) {
    return assigned === 'evening' || assigned === 'dropoff' || assigned === 'drop' || assigned === 'pm' || assigned === 'both';
  }
  return assigned === trip;
}

/** Pull student/assignment rows from trip, list, or Spring page payloads. */
export function extractStudentRows(data) {
  if (Array.isArray(data)) return data;
  const raw = asRecord(data);
  const stop = asRecord(raw.stop);
  const candidates = [
    raw.students,
    raw.assignments,
    raw.items,
    raw.content,
    raw.data,
    stop.students,
    stop.assignedStudents,
    stop.assigned_students,
  ];
  for (const value of candidates) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

export function filterStudentsForStop(students, stopId, { trustMissingStopId = false } = {}) {
  const wanted = String(stopId || '').trim();
  if (!wanted) return [];
  return (Array.isArray(students) ? students : []).filter((student) => {
    if (!student?.studentId) return false;
    if (!student.stopId) return Boolean(trustMissingStopId);
    return sameStopId(student.stopId, wanted);
  });
}

function normalizeActionBlock(raw) {
  const block = asRecord(raw);
  if (!Object.keys(block).length && raw == null) return null;
  return {
    status: pickString(block.status, STUDENT_ACTION_STATUS.PENDING) || STUDENT_ACTION_STATUS.PENDING,
    markedAt: pickString(block.markedAt, block.marked_at) || null,
    markedByDriverId: pickString(block.markedByDriverId, block.marked_by_driver_id) || null,
    parentApprovalStatus: pickString(
      block.parentApprovalStatus,
      block.parent_approval_status,
    ) || null,
    parentApprovedAt: pickString(block.parentApprovedAt, block.parent_approved_at) || null,
    stopId: pickString(block.stopId, block.stop_id) || null,
    stopName: pickString(block.stopName, block.stop_name) || null,
    reason: pickString(block.reason, block.rejectionReason, block.rejection_reason) || null,
  };
}

/** @returns {import('../types/transportModels.js').StopAssignedStudent|null} */
export function normalizeStopAssignedStudent(item) {
  if (!item) return null;
  const raw = asRecord(item);
  const studentId = pickString(raw.studentId, raw.student_id, asRecord(raw.student).id);
  if (!studentId) return null;
  const student = asRecord(raw.student);
  const klass = asRecord(raw.class);
  const section = asRecord(raw.section);
  return {
    studentId,
    studentName: pickString(
      raw.studentName,
      raw.student_name,
      student.name,
      student.fullName,
      student.full_name,
    ) || 'Student',
    profileImageUrl: pickString(
      raw.profileImageUrl,
      raw.profile_image_url,
      student.profileImageUrl,
    ) || null,
    classId: pickString(raw.classId, raw.class_id, klass.id) || null,
    className: pickString(raw.className, raw.class_name, klass.name) || null,
    sectionId: pickString(raw.sectionId, raw.section_id, section.id) || null,
    sectionName: pickString(raw.sectionName, raw.section_name, section.name) || null,
    parentName: pickString(raw.parentName, raw.parent_name) || null,
    assignmentId: pickString(raw.assignmentId, raw.assignment_id) || null,
    stopId: pickString(raw.stopId, raw.stop_id) || null,
    stopName: pickString(raw.stopName, raw.stop_name) || null,
    pickup: normalizeActionBlock(raw.pickup) || {
      status: pickString(raw.pickupStatus, raw.pickup_status, STUDENT_ACTION_STATUS.PENDING),
      markedAt: null,
      parentApprovalStatus: null,
    },
    dropoff: normalizeActionBlock(raw.dropoff) || {
      status: pickString(raw.dropoffStatus, raw.dropoff_status, STUDENT_ACTION_STATUS.PENDING),
      markedAt: null,
      parentApprovalStatus: null,
    },
  };
}

export function normalizeTripStopStudentsPayload(data, options = {}) {
  const raw = asRecord(data);
  const stop = asRecord(raw.stop);
  const stopId = pickString(
    options.stopId,
    stop.stopId,
    stop.stop_id,
    stop.id,
    raw.stopId,
    raw.stop_id,
  ) || '';
  const students = filterStudentsForStop(
    extractStudentRows(data).map(normalizeStopAssignedStudent).filter(Boolean),
    stopId,
    { trustMissingStopId: options.trustMissingStopId ?? true },
  );
  const direction = pickString(options.direction, raw.direction);
  return {
    tripId: pickString(raw.tripId, raw.trip_id) || '',
    stop: {
      stopId,
      stopName: pickString(stop.stopName, stop.stop_name, stop.name, raw.stopName) || 'Stop',
      displaySequence: Number(stop.displaySequence ?? stop.display_sequence ?? stop.sequence) || null,
      sequence: Number(stop.sequence) || null,
      latitude: Number(stop.lat ?? stop.latitude) || null,
      longitude: Number(stop.lng ?? stop.longitude) || null,
    },
    students,
    counts: computeStudentCounts(students, direction),
  };
}

export function normalizeParentStudentTripStatus(data) {
  if (!data) return null;
  const raw = asRecord(data);
  const studentId = pickString(raw.studentId, raw.student_id);
  if (!studentId) return null;
  return {
    studentId,
    studentName: pickString(raw.studentName, raw.student_name) || 'Student',
    tripId: pickString(raw.tripId, raw.trip_id) || '',
    direction: pickString(raw.direction) || null,
    pickup: normalizeActionBlock(raw.pickup),
    dropoff: normalizeActionBlock(raw.dropoff),
    timeline: Array.isArray(raw.timeline) ? raw.timeline : [],
  };
}

export function computeStudentCounts(students = [], direction) {
  const list = Array.isArray(students) ? students : [];
  const pickupTrip = isPickupDirection(direction);
  const dropoffTrip = isDropoffDirection(direction);
  let pickedUpCount = 0;
  let droppedOffCount = 0;
  let pendingCount = 0;
  let notPresentCount = 0;
  let skippedCount = 0;

  list.forEach((student) => {
    if (dropoffTrip && !pickupTrip) {
      const status = String(student?.dropoff?.status || STUDENT_ACTION_STATUS.PENDING).toUpperCase();
      if (status === STUDENT_ACTION_STATUS.DROPPED_OFF) droppedOffCount += 1;
      else if (status === STUDENT_ACTION_STATUS.SKIPPED) skippedCount += 1;
      else if (status === STUDENT_ACTION_STATUS.NOT_PRESENT) notPresentCount += 1;
      else pendingCount += 1;
    } else {
      const status = String(student?.pickup?.status || STUDENT_ACTION_STATUS.PENDING).toUpperCase();
      if (status === STUDENT_ACTION_STATUS.PICKED_UP) pickedUpCount += 1;
      else if (status === STUDENT_ACTION_STATUS.SKIPPED) skippedCount += 1;
      else if (status === STUDENT_ACTION_STATUS.NOT_PRESENT) notPresentCount += 1;
      else pendingCount += 1;
    }
  });

  return {
    assignedStudentCount: list.length,
    pickedUpCount,
    droppedOffCount,
    pendingCount,
    notPresentCount,
    skippedCount,
  };
}

/** Parent privacy: only show linked children at a stop. */
export function filterStudentsForParent(students, linkedStudentIds = []) {
  const allowed = new Set(
    (Array.isArray(linkedStudentIds) ? linkedStudentIds : [])
      .map((id) => String(id || '').trim())
      .filter(Boolean),
  );
  if (!allowed.size) return [];
  return (Array.isArray(students) ? students : []).filter(
    (student) => allowed.has(String(student?.studentId || '')),
  );
}

export function isTerminalDriverStatus(status, mode = 'pickup') {
  const s = String(status || '').toUpperCase();
  if (mode === 'dropoff') {
    return s === STUDENT_ACTION_STATUS.DROPPED_OFF
      || s === STUDENT_ACTION_STATUS.SKIPPED
      || s === STUDENT_ACTION_STATUS.NOT_PRESENT;
  }
  return s === STUDENT_ACTION_STATUS.PICKED_UP
    || s === STUDENT_ACTION_STATUS.NOT_PRESENT
    || s === STUDENT_ACTION_STATUS.SKIPPED;
}

export function friendlyTransportError(error) {
  const code = error?.code || error?.error?.code;
  const message = error?.message || error?.error?.message;
  switch (code) {
    case TRANSPORT_ERROR_CODES.STUDENT_NOT_ON_TRIP:
      return 'This student is not on the active trip.';
    case TRANSPORT_ERROR_CODES.STUDENT_NOT_AT_STOP:
      return 'This student is not assigned to this stop.';
    case TRANSPORT_ERROR_CODES.PICKUP_ALREADY_MARKED:
      return 'Pickup was already marked for this student.';
    case TRANSPORT_ERROR_CODES.DROPOFF_ALREADY_MARKED:
      return 'Drop-off was already marked for this student.';
    case TRANSPORT_ERROR_CODES.PICKUP_NOT_MARKED:
      return 'Pickup has not been marked yet.';
    case TRANSPORT_ERROR_CODES.DROPOFF_NOT_MARKED:
      return 'Drop-off has not been marked yet.';
    case TRANSPORT_ERROR_CODES.PARENT_NOT_AUTHORIZED:
      return 'You are not authorized for this student.';
    case TRANSPORT_ERROR_CODES.DRIVER_NOT_AUTHORIZED:
      return 'You are not authorized to mark students on this trip.';
    case TRANSPORT_ERROR_CODES.PARENT_APPROVAL_ALREADY_SUBMITTED:
      return 'You already submitted a confirmation for this action.';
    default:
      return message || 'Transport request failed.';
  }
}

/**
 * Apply student transport WS events onto a students array (by studentId).
 * Unknown event types are ignored (no throw).
 */
export function applyStudentTransportWsEvent(students, event) {
  const type = String(event?.type || event?.event || '');
  const data = asRecord(event?.data);
  const studentId = pickString(data.studentId, data.student_id);
  if (!studentId) return students;

  const list = Array.isArray(students) ? students : [];
  const index = list.findIndex((item) => String(item.studentId) === String(studentId));
  const existing = index >= 0 ? list[index] : normalizeStopAssignedStudent({
    studentId,
    studentName: data.studentName || data.student_name,
    stopId: data.stopId || data.stop_id,
    stopName: data.stopName || data.stop_name,
  });
  if (!existing) return list;

  let next = { ...existing };
  const markedAt = pickString(data.markedAt, data.marked_at);
  const approval = pickString(data.parentApprovalStatus, data.parent_approval_status);
  const approvedAt = pickString(data.parentApprovedAt, data.parent_approved_at);

  if (type === 'transport.student_picked_up') {
    next = {
      ...next,
      pickup: {
        ...(next.pickup || {}),
        status: pickString(data.status, STUDENT_ACTION_STATUS.PICKED_UP),
        markedAt: markedAt || next.pickup?.markedAt,
        parentApprovalStatus: approval || PARENT_APPROVAL_STATUS.PENDING,
        stopId: pickString(data.stopId, data.stop_id) || next.pickup?.stopId,
        stopName: pickString(data.stopName, data.stop_name) || next.pickup?.stopName,
      },
    };
  } else if (type === 'transport.student_dropped_off') {
    next = {
      ...next,
      dropoff: {
        ...(next.dropoff || {}),
        status: pickString(data.status, STUDENT_ACTION_STATUS.DROPPED_OFF),
        markedAt: markedAt || next.dropoff?.markedAt,
        parentApprovalStatus: approval || PARENT_APPROVAL_STATUS.PENDING,
        stopId: pickString(data.stopId, data.stop_id) || next.dropoff?.stopId,
        stopName: pickString(data.stopName, data.stop_name) || next.dropoff?.stopName,
      },
    };
  } else if (type === 'transport.pickup_parent_approved' || type === 'transport.pickup_parent_rejected') {
    next = {
      ...next,
      pickup: {
        ...(next.pickup || {}),
        parentApprovalStatus: type.endsWith('approved')
          ? PARENT_APPROVAL_STATUS.APPROVED
          : PARENT_APPROVAL_STATUS.REJECTED,
        parentApprovedAt: approvedAt || new Date().toISOString(),
      },
    };
  } else if (type === 'transport.dropoff_parent_approved' || type === 'transport.dropoff_parent_rejected') {
    next = {
      ...next,
      dropoff: {
        ...(next.dropoff || {}),
        parentApprovalStatus: type.endsWith('approved')
          ? PARENT_APPROVAL_STATUS.APPROVED
          : PARENT_APPROVAL_STATUS.REJECTED,
        parentApprovedAt: approvedAt || new Date().toISOString(),
      },
    };
  } else {
    return list;
  }

  if (index >= 0) {
    const copy = list.slice();
    copy[index] = next;
    return copy;
  }
  return [...list, next];
}

export function isStudentTransportWsEvent(type) {
  const t = String(type || '');
  return t === 'transport.student_picked_up'
    || t === 'transport.student_dropped_off'
    || t === 'transport.pickup_parent_approved'
    || t === 'transport.pickup_parent_rejected'
    || t === 'transport.dropoff_parent_approved'
    || t === 'transport.dropoff_parent_rejected';
}

export const REJECTION_REASON_OPTIONS = [
  { value: 'Student was not picked up', label: 'Student was not picked up' },
  { value: 'Wrong pickup time', label: 'Wrong pickup time' },
  { value: 'Wrong stop', label: 'Wrong stop' },
  { value: 'Student has not arrived', label: 'Student has not arrived' },
  { value: 'Other', label: 'Other' },
];
