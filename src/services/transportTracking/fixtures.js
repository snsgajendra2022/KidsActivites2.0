/**
 * DEV-ONLY transport fixtures.
 * Enabled only when TRANSPORT_API_MODE=fixture (or VITE_TRANSPORT_API_MODE=fixture)
 * AND the app is not in production mode.
 *
 * Never used for production GPS — no fake live movement beyond static snapshot data.
 */

const FIXTURE_VEHICLE_ID = 'fixture-vehicle-1';
const FIXTURE_ROUTE_ID = 'fixture-route-1';
const FIXTURE_TRIP_ID = 'fixture-trip-1';

const FIXTURE_STOPS = [
  {
    id: 'fixture-stop-1',
    name: 'Stop A',
    sequence: 1,
    lat: 18.5204,
    lng: 73.8567,
    stopType: 'pickup',
  },
  {
    id: 'fixture-stop-2',
    name: 'Stop B',
    sequence: 2,
    lat: 18.5304,
    lng: 73.8467,
    stopType: 'pickup',
  },
  {
    id: 'fixture-stop-3',
    name: 'School',
    sequence: 3,
    lat: 18.5404,
    lng: 73.8367,
    stopType: 'school',
  },
];

export function isTransportFixtureMode() {
  if (import.meta.env.PROD || import.meta.env.VITE_PRODUCTION_MODE === 'true') {
    return false;
  }
  const mode = String(
    import.meta.env.VITE_TRANSPORT_API_MODE
    || import.meta.env.TRANSPORT_API_MODE
    || '',
  ).trim().toLowerCase();
  return mode === 'fixture';
}

export function fixtureParentLive(params = {}) {
  const studentId = params.studentId || 'fixture-student-1';
  return {
    stateCode: 'LIVE',
    studentId,
    vehicleId: FIXTURE_VEHICLE_ID,
    vehicleNumber: 'MH-12-FIX-0001',
    routeId: FIXTURE_ROUTE_ID,
    routeName: 'Fixture North Route',
    driverName: 'Fixture Driver',
    assignedStop: 'Stop B',
    status: 'running',
    tripStatus: 'active',
    activeTripId: FIXTURE_TRIP_ID,
    etaMinutes: 8,
    lastStop: 'Stop A',
    nextStop: 'Stop B',
    lat: 18.5254,
    lng: 73.8517,
    heading: 45,
    speedKmh: 22,
    sequence: 42,
    updatedAt: new Date().toISOString(),
    stops: FIXTURE_STOPS,
    geometry: null,
  };
}

export function fixtureAdminFleet(status = 'all') {
  const vehicles = [
    {
      vehicle_id: FIXTURE_VEHICLE_ID,
      vehicle_number: 'MH-12-FIX-0001',
      route_id: FIXTURE_ROUTE_ID,
      route_name: 'Fixture North Route',
      driver_name: 'Fixture Driver',
      latitude: 18.5254,
      longitude: 73.8517,
      heading: 45,
      speed_kmh: 22,
      tracking_status: 'running',
      trip_status: 'active',
      student_count: 12,
      sequence: 42,
      updated_at: new Date().toISOString(),
      eta: { etaMinutes: 8, nextStopName: 'Stop B', lastStopName: 'Stop A' },
    },
    {
      vehicle_id: 'fixture-vehicle-2',
      vehicle_number: 'MH-12-FIX-0002',
      route_id: 'fixture-route-2',
      route_name: 'Fixture South Route',
      driver_name: 'Fixture Driver 2',
      latitude: 18.5104,
      longitude: 73.8607,
      heading: 120,
      speed_kmh: 0,
      tracking_status: 'stopped',
      trip_status: 'active',
      student_count: 8,
      sequence: 10,
      updated_at: new Date().toISOString(),
      eta: { etaMinutes: 15, nextStopName: 'School', lastStopName: 'Stop C' },
    },
  ];
  if (!status || status === 'all') return vehicles;
  return vehicles.filter((item) => item.tracking_status === status);
}

export function fixtureGpsDevices() {
  return [
    {
      id: 'fixture-gps-1',
      vehicleId: FIXTURE_VEHICLE_ID,
      imei: '353342622051695',
      provider: 'generic',
      status: 'active',
      lastSeenAt: new Date().toISOString(),
      vehicleNumber: 'MH-12-FIX-0001',
    },
  ];
}

export function fixtureDriverCurrentTrip() {
  return {
    vehicleId: FIXTURE_VEHICLE_ID,
    vehicleNumber: 'MH-12-FIX-0001',
    routeId: FIXTURE_ROUTE_ID,
    routeName: 'Fixture North Route',
    driverName: 'Fixture Driver',
    activeTripId: FIXTURE_TRIP_ID,
    direction: 'morning',
    status: 'active',
    stops: FIXTURE_STOPS,
  };
}

export function fixtureStartTrip(payload = {}) {
  return {
    id: FIXTURE_TRIP_ID,
    vehicleId: payload.vehicle_id || payload.vehicleId || FIXTURE_VEHICLE_ID,
    routeId: payload.route_id || payload.routeId || FIXTURE_ROUTE_ID,
    direction: payload.direction || 'morning',
    status: 'active',
    startedAt: new Date().toISOString(),
  };
}
