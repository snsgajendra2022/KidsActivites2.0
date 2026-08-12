/**
 * Shared Live Bus Tracking models (JSDoc contracts for Web).
 * Align with docs/transport/MASTER_LIVE_TRACKING_API.md.
 */

/**
 * @typedef {'active'|'inactive'|'revoked'|'disabled'|'lost'} GpsDeviceStatus
 * @typedef {'running'|'stopped'|'warning'|'offline'|'completed'} TrackingStatus
 * @typedef {'active'|'completed'|'cancelled'|'started'|'en_route'} TripStatus
 * @typedef {'morning'|'evening'|'both'} AssignmentDirection
 * @typedef {'pickup'|'dropoff'|'school'} StopType
 * @typedef {'NO_ASSIGNMENT'|'ASSIGNED_NO_ACTIVE_TRIP'|'WAITING_FOR_GPS'|'LIVE'|'WARNING'|'OFFLINE'|'COMPLETED'|'TRIP_COMPLETED'} TrackingUiStateCode
 */

/**
 * @typedef {object} TransportStop
 * @property {string} id
 * @property {string} [name]
 * @property {number} [sequence]
 * @property {number|null} [lat]
 * @property {number|null} [lng]
 * @property {number} [radiusMeters]
 * @property {StopType|string} [stopType]
 */

/**
 * @typedef {object} TransportVehicle
 * @property {string} id
 * @property {string} [vehicleNumber]
 * @property {number} [capacity]
 * @property {string|null} [driverUserId]
 * @property {string} [driverName]
 * @property {string|null} [attendantUserId]
 * @property {string|null} [routeId]
 * @property {string} [routeName]
 * @property {string} [status]
 */

/**
 * @typedef {object} TransportRoute
 * @property {string} id
 * @property {string} [name]
 * @property {string} [morningStart]
 * @property {string} [eveningStart]
 * @property {string} [status]
 * @property {TransportStop[]} [stops]
 * @property {object|null} [geometry]
 */

/**
 * @typedef {object} TransportAssignment
 * @property {string} id
 * @property {string} classId
 * @property {string} studentId
 * @property {string} routeId
 * @property {string} [stopId]
 * @property {string} [vehicleId]
 * @property {AssignmentDirection|string} [direction]
 * @property {string} [status]
 * @property {string} [className]
 * @property {string} [studentName]
 * @property {string} [routeName]
 * @property {string} [stopName]
 * @property {string} [vehicleNumber]
 */

/**
 * @typedef {object} TransportTrip
 * @property {string} id
 * @property {string} vehicleId
 * @property {string} [routeId]
 * @property {string} [driverUserId]
 * @property {'morning'|'evening'|string} [direction]
 * @property {TripStatus|string} [status]
 * @property {string} [startedAt]
 * @property {string} [completedAt]
 */

/**
 * @typedef {object} GpsDevice
 * @property {string} id
 * @property {string} vehicleId
 * @property {string} [imei]
 * @property {string} [provider]
 * @property {GpsDeviceStatus|string} [status]
 * @property {string} [lastSeenAt]
 * @property {string} [vehicleNumber]
 * @property {string} [deviceToken] plaintext — only on create/rotate
 */

/**
 * @typedef {object} VehicleLocation
 * @property {string} [vehicleId]
 * @property {number} [lat]
 * @property {number} [lng]
 * @property {number} [speedKmh]
 * @property {number} [heading]
 * @property {number} [accuracy]
 * @property {number} [sequence]
 * @property {string} [recordedAt]
 * @property {string} [updatedAt]
 * @property {TrackingStatus|string} [trackingStatus]
 * @property {string} [tripId]
 * @property {'device'|'driver_app'|string} [source]
 */

/**
 * @typedef {object} TransportEta
 * @property {number|null} [etaMinutes]
 * @property {string} [nextStopName]
 * @property {string} [lastStopName]
 * @property {string} [assignedStopName]
 */

/**
 * @typedef {object} ParentLiveSnapshot
 * @property {TrackingUiStateCode|string} [stateCode]
 * @property {string} [studentId]
 * @property {string} [vehicleId]
 * @property {string} [vehicleNumber]
 * @property {string} [routeId]
 * @property {string} [routeName]
 * @property {string} [driverName]
 * @property {string} [assignedStop]
 * @property {TrackingStatus|string} [status]
 * @property {TripStatus|string} [tripStatus]
 * @property {string} [activeTripId]
 * @property {number} [etaMinutes]
 * @property {string} [lastStop]
 * @property {string} [nextStop]
 * @property {number} [lat]
 * @property {number} [lng]
 * @property {number} [heading]
 * @property {number} [speedKmh]
 * @property {number} [sequence]
 * @property {string} [updatedAt]
 * @property {TransportStop[]} [stops]
 * @property {object|null} [geometry]
 */

/**
 * @typedef {object} AdminFleetVehicle
 * @property {string} [vehicle_id]
 * @property {string} [vehicleId]
 * @property {string} [vehicle_number]
 * @property {string} [vehicleNumber]
 * @property {string} [route_id]
 * @property {string} [routeId]
 * @property {string} [route_name]
 * @property {string} [routeName]
 * @property {string} [driver_name]
 * @property {string} [driverName]
 * @property {number} [latitude]
 * @property {number} [longitude]
 * @property {number} [heading]
 * @property {number} [speed_kmh]
 * @property {TrackingStatus|string} [tracking_status]
 * @property {string} [trip_status]
 * @property {number} [student_count]
 * @property {number} [sequence]
 * @property {string} [updated_at]
 * @property {TransportEta} [eta]
 */

/**
 * @typedef {object} TrackingWsEvent
 * @property {string} type
 * @property {object} [data]
 */

export const TRACKING_STATUS = Object.freeze({
  RUNNING: 'running',
  STOPPED: 'stopped',
  WARNING: 'warning',
  OFFLINE: 'offline',
  COMPLETED: 'completed',
});

export const WS_EVENT_TYPES = Object.freeze({
  LOCATION_UPDATED: 'vehicle.location_updated',
  TRACKING_WARNING: 'vehicle.tracking_warning',
  TRACKING_OFFLINE: 'vehicle.tracking_offline',
  TRIP_STARTED: 'transport.trip_started',
  TRIP_COMPLETED: 'transport.trip_completed',
  GEOFENCE: 'transport.geofence',
  STUDENT_PICKED_UP: 'transport.student_picked_up',
  STUDENT_DROPPED_OFF: 'transport.student_dropped_off',
  PICKUP_PARENT_APPROVED: 'transport.pickup_parent_approved',
  PICKUP_PARENT_REJECTED: 'transport.pickup_parent_rejected',
  DROPOFF_PARENT_APPROVED: 'transport.dropoff_parent_approved',
  DROPOFF_PARENT_REJECTED: 'transport.dropoff_parent_rejected',
});

/**
 * @typedef {'PENDING'|'PICKED_UP'|'DROPPED_OFF'|'NOT_PRESENT'|'SKIPPED'|'PARENT_CONFIRMED'|'PARENT_REJECTED'|string} StudentTransportActionStatus
 * @typedef {'PENDING'|'APPROVED'|'REJECTED'|null|string} ParentApprovalStatus
 *
 * @typedef {object} StudentActionBlock
 * @property {StudentTransportActionStatus} status
 * @property {string|null} [markedAt]
 * @property {string|null} [markedByDriverId]
 * @property {ParentApprovalStatus} [parentApprovalStatus]
 * @property {string|null} [parentApprovedAt]
 * @property {string|null} [stopId]
 * @property {string|null} [stopName]
 * @property {string|null} [reason]
 *
 * @typedef {object} StopAssignedStudent
 * @property {string} studentId
 * @property {string} studentName
 * @property {string|null} [profileImageUrl]
 * @property {string|null} [classId]
 * @property {string|null} [className]
 * @property {string|null} [sectionId]
 * @property {string|null} [sectionName]
 * @property {string|null} [parentName]
 * @property {string|null} [assignmentId]
 * @property {string|null} [stopId]
 * @property {string|null} [stopName]
 * @property {StudentActionBlock|null} [pickup]
 * @property {StudentActionBlock|null} [dropoff]
 *
 * @typedef {object} StudentTripAttendance
 * @property {string} studentId
 * @property {string} tripId
 * @property {StudentActionBlock} [pickup]
 * @property {StudentActionBlock} [dropoff]
 */

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

function pickNumber(...values) {
  for (const value of values) {
    const num = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(num)) return num;
  }
  return undefined;
}

/** @returns {TransportStop[]} */
export function normalizeStops(stops) {
  if (!Array.isArray(stops)) return [];
  return stops
    .map((item, index) => {
      const raw = asRecord(item);
      return {
        id: pickString(raw.id, `stop-${index + 1}`) || `stop-${index + 1}`,
        name: pickString(raw.name, `Stop ${index + 1}`),
        sequence: pickNumber(raw.sequence) || index + 1,
        lat: pickNumber(raw.lat, raw.latitude) ?? null,
        lng: pickNumber(raw.lng, raw.longitude) ?? null,
        radiusMeters: pickNumber(raw.radiusMeters, raw.radius_meters),
        stopType: pickString(raw.stopType, raw.stop_type)
          || (index === stops.length - 1 ? 'school' : 'pickup'),
      };
    })
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
}

/** @returns {GpsDevice|null} */
export function normalizeGpsDevice(item) {
  if (!item) return null;
  const raw = asRecord(item);
  const id = pickString(raw.id, raw.deviceId, raw.device_id);
  if (!id) return null;
  return {
    id,
    vehicleId: pickString(raw.vehicleId, raw.vehicle_id) || '',
    imei: pickString(raw.imei),
    provider: pickString(raw.provider, 'generic'),
    status: pickString(raw.status, 'active'),
    lastSeenAt: pickString(raw.lastSeenAt, raw.last_seen_at),
    vehicleNumber: pickString(raw.vehicleNumber, raw.vehicle_number),
    deviceToken: pickString(raw.deviceToken, raw.device_token, raw.token) || undefined,
  };
}

/** @returns {ParentLiveSnapshot|null} */
export function normalizeParentLiveSnapshot(data) {
  if (data == null) return null;
  const raw = asRecord(data);
  const eta = asRecord(raw.eta);
  const location = asRecord(raw.location || raw.currentLocation || raw.current_location);
  const route = asRecord(raw.route);
  const vehicle = asRecord(raw.vehicle);
  const trip = asRecord(raw.trip || raw.activeTrip || raw.active_trip);
  return {
    stateCode: pickString(raw.stateCode, raw.state_code, raw.uiState, raw.ui_state),
    studentId: pickString(raw.studentId, raw.student_id, asRecord(raw.student).id),
    vehicleId: pickString(raw.vehicleId, raw.vehicle_id, vehicle.id),
    vehicleNumber: pickString(raw.vehicleNumber, raw.vehicle_number, vehicle.vehicleNumber, vehicle.number),
    routeId: pickString(raw.routeId, raw.route_id, route.id),
    routeName: pickString(raw.routeName, raw.route_name, route.name),
    driverName: pickString(raw.driverName, raw.driver_name, asRecord(raw.driver).name),
    assignedStop: pickString(raw.assignedStop, raw.assigned_stop, raw.stopName, raw.stop_name),
    status: pickString(raw.status, raw.trackingStatus, raw.tracking_status),
    tripStatus: pickString(raw.tripStatus, raw.trip_status, trip.status),
    activeTripId: pickString(raw.activeTripId, raw.active_trip_id, raw.tripId, raw.trip_id, trip.id),
    etaMinutes: pickNumber(raw.etaMinutes, eta.etaMinutes),
    lastStop: pickString(raw.lastStop, raw.last_stop, eta.lastStopName),
    nextStop: pickString(raw.nextStop, raw.next_stop, eta.nextStopName),
    lat: pickNumber(raw.lat, raw.latitude, location.lat, location.latitude),
    lng: pickNumber(raw.lng, raw.longitude, location.lng, location.longitude),
    heading: pickNumber(raw.heading, location.heading),
    speedKmh: pickNumber(raw.speedKmh, raw.speed_kmh, location.speedKmh),
    sequence: pickNumber(raw.sequence, location.sequence),
    updatedAt: pickString(raw.updatedAt, raw.updated_at, location.updatedAt, location.recordedAt),
    stops: normalizeStops(raw.stops ?? raw.stopList ?? route.stops ?? route.stopList),
    geometry: raw.geometry ?? route.geometry ?? null,
  };
}
