/**
 * Parent / admin live tracking UI states derived from API snapshot.
 * Backend remains authoritative for trackingStatus; this only maps display.
 */
export const TRACKING_UI_STATES = {
  NO_ASSIGNMENT: 'NO_ASSIGNMENT',
  ASSIGNED_NO_ACTIVE_TRIP: 'ASSIGNED_NO_ACTIVE_TRIP',
  WAITING_FOR_GPS: 'WAITING_FOR_GPS',
  LIVE: 'LIVE',
  WARNING: 'WARNING',
  OFFLINE: 'OFFLINE',
  COMPLETED: 'COMPLETED',
  /** Alias accepted from backend / docs */
  TRIP_COMPLETED: 'TRIP_COMPLETED',
};

export function resolveParentTrackingState(snapshot) {
  if (snapshot == null) return TRACKING_UI_STATES.NO_ASSIGNMENT;

  const code = String(snapshot.stateCode || snapshot.state_code || snapshot.uiState || '').toUpperCase();
  if (code === TRACKING_UI_STATES.TRIP_COMPLETED || code === TRACKING_UI_STATES.COMPLETED) {
    return TRACKING_UI_STATES.COMPLETED;
  }
  if (Object.values(TRACKING_UI_STATES).includes(code)) return code;

  const status = String(snapshot.status || snapshot.trackingStatus || snapshot.tracking_status || '').toLowerCase();
  const tripStatus = String(snapshot.tripStatus || snapshot.trip_status || '').toLowerCase();
  const hasVehicle = Boolean(snapshot.vehicleId || snapshot.vehicle_id);
  const hasCoords = Number.isFinite(Number(snapshot.lat ?? snapshot.latitude))
    && Number.isFinite(Number(snapshot.lng ?? snapshot.longitude));
  const hasActiveTrip = Boolean(
    snapshot.activeTripId
    || snapshot.active_trip_id
    || snapshot.tripId
    || snapshot.trip_id
    || ['running', 'in_progress', 'active'].includes(tripStatus)
    || ['running', 'warning', 'stopped'].includes(status),
  );

  if (!hasVehicle) return TRACKING_UI_STATES.NO_ASSIGNMENT;
  if (tripStatus === 'completed' || status === 'completed') return TRACKING_UI_STATES.COMPLETED;
  if (status === 'offline') return TRACKING_UI_STATES.OFFLINE;
  if (status === 'warning') return TRACKING_UI_STATES.WARNING;
  if (!hasActiveTrip) return TRACKING_UI_STATES.ASSIGNED_NO_ACTIVE_TRIP;
  if (!hasCoords) return TRACKING_UI_STATES.WAITING_FOR_GPS;
  if (status === 'running' || status === 'stopped' || hasCoords) return TRACKING_UI_STATES.LIVE;
  return TRACKING_UI_STATES.ASSIGNED_NO_ACTIVE_TRIP;
}

export function trackingStateLabel(state) {
  switch (state) {
    case TRACKING_UI_STATES.NO_ASSIGNMENT:
      return 'No bus assignment';
    case TRACKING_UI_STATES.ASSIGNED_NO_ACTIVE_TRIP:
      return 'Assigned — waiting for trip';
    case TRACKING_UI_STATES.WAITING_FOR_GPS:
      return 'Trip active — waiting for GPS';
    case TRACKING_UI_STATES.LIVE:
      return 'Live';
    case TRACKING_UI_STATES.WARNING:
      return 'Tracking warning';
    case TRACKING_UI_STATES.OFFLINE:
      return 'Bus offline';
    case TRACKING_UI_STATES.COMPLETED:
    case TRACKING_UI_STATES.TRIP_COMPLETED:
      return 'Trip completed';
    default:
      return 'Unknown';
  }
}

export function trackingStateHint(state) {
  switch (state) {
    case TRACKING_UI_STATES.NO_ASSIGNMENT:
      return 'Ask the school to assign this child under Student Bus Assignments.';
    case TRACKING_UI_STATES.ASSIGNED_NO_ACTIVE_TRIP:
      return 'Your child is on a bus route. The live map appears when the driver starts the trip.';
    case TRACKING_UI_STATES.WAITING_FOR_GPS:
      return 'Trip is running. Route path is shown; the bus marker appears after the first GPS fix.';
    case TRACKING_UI_STATES.LIVE:
      return 'Showing authenticated live GPS for the assigned vehicle.';
    case TRACKING_UI_STATES.WARNING:
      return 'No fresh GPS for a few minutes. Last known position is shown.';
    case TRACKING_UI_STATES.OFFLINE:
      return 'Bus has not reported location recently.';
    case TRACKING_UI_STATES.COMPLETED:
    case TRACKING_UI_STATES.TRIP_COMPLETED:
      return 'This trip has ended.';
    default:
      return '';
  }
}
