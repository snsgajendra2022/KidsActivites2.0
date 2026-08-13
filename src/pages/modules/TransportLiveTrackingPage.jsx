import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bus,
  MapPinned,
  RefreshCw,
  Route as RouteIcon,
  Search,
  Signal,
  SignalZero,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { LoadingState, PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import LiveBusMap from '../../components/transport/LiveBusMap.jsx';
import GpsDeviceSetupModal from '../../components/transport/GpsDeviceSetupModal.jsx';
import RouteStopTimeline from '../../components/transport/RouteStopTimeline.jsx';
import StopDetailsModal from '../../components/transport/StopDetailsModal.jsx';
import TripStudentStatusTable from '../../components/transport/TripStudentStatusTable.jsx';
import {
  fetchAdminFleetLive,
  getTripStopStudents,
  getTripStudentTransportStatuses,
} from '../../services/transportTracking/trackingApi.js';
import { createTrackingSocket } from '../../services/transportTracking/trackingSocket.js';
import { transportRouteService, transportVehicleService } from '../../services/schoolModules/index.js';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { geocodeAddress } from '../../services/geocoding/placeSearch.js';
import {
  attachRouteToLiveVehicle,
  normalizeRouteStops,
  routeHasMappedStops,
  stopsToMapFeatures,
  vehicleMatchesRoute,
} from '../../utils/transportRouteGeo.js';
import { isNewerLocation } from '../../utils/transportLocationSequence.js';
import useRoadRoute from '../../hooks/useRoadRoute.js';
import useTripStopRotation from '../../hooks/useTripStopRotation.js';
import {
  formatRouteDistance,
  formatRouteDuration,
} from '../../services/geocoding/roadRouting.js';
import {
  WS_EVENT_TYPES,
  normalizeAdminFleetVehicle,
  trackingEventType,
  unwrapTrackingEventData,
} from '../../types/transportModels.js';
import {
  applyStudentTransportWsEvent,
  friendlyTransportError,
  isStudentTransportWsEvent,
} from '../../utils/transportStudentAttendance.js';
import { useToast } from '../../context/ToastContext.jsx';

const FILTERS = [
  { value: 'all', label: 'All bus statuses' },
  { value: 'running', label: 'Running' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'warning', label: 'Warning' },
  { value: 'offline', label: 'Offline' },
];

const STATUS_DOT = {
  running: 'bg-emerald-500',
  stopped: 'bg-amber-500',
  warning: 'bg-rose-500',
  offline: 'bg-slate-400',
};

function upsertVehicle(list, update, catalog = { routes: [], vehicles: [] }) {
  const normalized = normalizeAdminFleetVehicle({
    ...(typeof update === 'object' && update ? update : {}),
  });
  const id = String(normalized?.vehicle_id || update?.vehicleId || update?.vehicle_id || '');
  if (!id || id === 'undefined') return list;
  const next = [...list];
  const index = next.findIndex((item) => String(item.vehicle_id || item.vehicleId) === id);
  const current = index >= 0 ? next[index] : null;
  const incomingMeta = {
    sequence: normalized?.sequence ?? update?.sequence,
    updatedAt: normalized?.updated_at || update?.updatedAt || update?.updated_at,
    recordedAt: update?.recordedAt || update?.recorded_at,
  };
  const incomingLat = normalized?.latitude ?? update?.latitude ?? update?.lat;
  const incomingLng = normalized?.longitude ?? update?.longitude ?? update?.lng;
  if (current && (incomingLat != null || incomingLng != null)
    && !isNewerLocation({
      sequence: current.sequence,
      updatedAt: current.updated_at || current.updatedAt,
    }, incomingMeta)) {
    return list;
  }
  const merged = attachRouteToLiveVehicle({
    ...(current || {}),
    ...(normalized || {}),
    vehicle_id: id,
    vehicleId: id,
    vehicle_number: normalized?.vehicle_number || current?.vehicle_number || '',
    latitude: incomingLat ?? current?.latitude,
    longitude: incomingLng ?? current?.longitude,
    lat: incomingLat ?? current?.lat,
    lng: incomingLng ?? current?.lng,
    speed_kmh: normalized?.speed_kmh ?? current?.speed_kmh,
    heading: normalized?.heading ?? current?.heading,
    tracking_status: normalized?.tracking_status || current?.tracking_status,
    trackingStatus: normalized?.tracking_status || current?.trackingStatus,
    updated_at: incomingMeta.updatedAt || current?.updated_at || new Date().toISOString(),
    sequence: incomingMeta.sequence ?? current?.sequence,
    trip_id: normalized?.trip_id || current?.trip_id,
    tripId: normalized?.trip_id || current?.tripId,
    trip_status: normalized?.trip_status || current?.trip_status,
    student_count: normalized?.student_count ?? current?.student_count,
    route_id: normalized?.route_id || current?.route_id,
    routeId: normalized?.routeId || current?.routeId,
    route_name: normalized?.route_name || current?.route_name,
    routeName: normalized?.routeName || current?.routeName,
    eta: update?.eta || current?.eta || null,
  }, catalog);
  if (index >= 0) next[index] = { ...next[index], ...merged };
  else next.push(merged);
  return next;
}

const FLEET_POLL_MS = 15000;

function Panel({ step, title, children, className = '' }) {
  return (
    <section className={`sb-card flex flex-col overflow-hidden ${className}`}>
      <header className="border-b border-[#eaecf0] bg-[#f8f9ff] px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#0058be]">
          Step {step}
        </p>
        <h3 className="text-sm font-bold text-[#0b1c30]">{title}</h3>
      </header>
      <div className="flex min-h-0 flex-1 flex-col p-4">{children}</div>
    </section>
  );
}

export default function TransportLiveTrackingPage() {
  const { config } = usePortalConfig();
  const { toast } = useToast();
  const schoolAddress = config?.school?.address || '';

  const [statusFilter, setStatusFilter] = useState('all');
  const [routeSearch, setRouteSearch] = useState('');
  const [routes, setRoutes] = useState([]);
  const [vehicleCatalog, setVehicleCatalog] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [fleetLoading, setFleetLoading] = useState(true);
  const [fleetError, setFleetError] = useState('');
  const [socketStatus, setSocketStatus] = useState({ state: 'idle' });
  const [selectedId, setSelectedId] = useState('');
  const [gpsOpen, setGpsOpen] = useState(false);
  const [schoolCenter, setSchoolCenter] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [stopStudents, setStopStudents] = useState([]);
  const [stopCounts, setStopCounts] = useState(null);
  const [stopLoading, setStopLoading] = useState(false);
  const [stopError, setStopError] = useState('');
  const [tripStatuses, setTripStatuses] = useState([]);
  const [tripStatusesLoading, setTripStatusesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!schoolAddress.trim()) return undefined;
    geocodeAddress(schoolAddress, { latitude: 22.9734, longitude: 78.6569 })
      .then((place) => {
        if (!cancelled && place) setSchoolCenter([place.latitude, place.longitude]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [schoolAddress]);

  const loadRoutes = useCallback(async () => {
    setRoutesLoading(true);
    try {
      const [data, fleet] = await Promise.all([
        transportRouteService.list(),
        transportVehicleService.list().catch(() => []),
      ]);
      const list = Array.isArray(data) ? data : [];
      const catalog = Array.isArray(fleet) ? fleet : [];
      setRoutes(list);
      setVehicleCatalog(catalog);
      setSelectedRouteId((current) => {
        if (current && list.some((route) => String(route.id) === String(current))) return current;
        const firstMapped = list.find(routeHasMappedStops);
        if (firstMapped) return String(firstMapped.id);
        return list[0] ? String(list[0].id) : '';
      });
    } catch {
      setRoutes([]);
      setVehicleCatalog([]);
      setSelectedRouteId('');
    } finally {
      setRoutesLoading(false);
    }
  }, []);

  const catalogRef = useRef({ routes: [], vehicles: [] });
  catalogRef.current = { routes, vehicles: vehicleCatalog };

  const loadFleet = useCallback(async (_status = 'all', { silent = false } = {}) => {
    if (!silent) {
      setFleetLoading(true);
      setFleetError('');
    }
    try {
      const data = await fetchAdminFleetLive();
      const catalog = catalogRef.current;
      const list = (Array.isArray(data) ? data : [])
        .map((item) => attachRouteToLiveVehicle(item, catalog))
        .filter(Boolean);
      setVehicles(list);
      if (!silent) setFleetError('');
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        setFleetError('You are not authorized to view the live fleet.');
        setVehicles([]);
      } else if (!silent) {
        setFleetError(err?.message || 'Unable to load live fleet.');
        setVehicles([]);
      }
    } finally {
      if (!silent) setFleetLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoutes();
    void loadFleet();
  }, [loadRoutes, loadFleet]);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadFleet('all', { silent: true });
    }, FLEET_POLL_MS);
    return () => clearInterval(timer);
  }, [loadFleet]);

  useEffect(() => {
    const socket = createTrackingSocket({
      onStatus: (status) => {
        setSocketStatus(status);
        if (status?.state === 'connected' && status?.reconnect) {
          void loadFleet('all', { silent: true });
        }
      },
      onEvent: (event) => {
        const type = trackingEventType(event);
        const payload = unwrapTrackingEventData(event);
        if (isStudentTransportWsEvent(type)) {
          setStopStudents((current) => applyStudentTransportWsEvent(current, { ...event, type, data: payload }));
          setTripStatuses((current) => applyStudentTransportWsEvent(current, { ...event, type, data: payload }));
          return;
        }
        if (type === WS_EVENT_TYPES.LOCATION_UPDATED && payload) {
          setVehicles((current) => upsertVehicle(current, payload, catalogRef.current));
          return;
        }
        if (type === WS_EVENT_TYPES.TRACKING_WARNING || type === WS_EVENT_TYPES.TRACKING_OFFLINE) {
          setVehicles((current) => upsertVehicle(current, {
            ...(payload || {}),
            trackingStatus: type === WS_EVENT_TYPES.TRACKING_OFFLINE ? 'offline' : 'warning',
            vehicleId: payload?.vehicle_id || payload?.vehicleId,
            latitude: payload?.latitude ?? payload?.lat,
            longitude: payload?.longitude ?? payload?.lng,
            updatedAt: payload?.updated_at || payload?.updatedAt,
            sequence: payload?.sequence,
          }, catalogRef.current));
          return;
        }
        if (type === WS_EVENT_TYPES.TRIP_STARTED && payload) {
          setVehicles((current) => upsertVehicle(current, {
            ...payload,
            tripStatus: payload.tripStatus || payload.trip_status || 'active',
            trackingStatus: payload.trackingStatus || payload.tracking_status || 'running',
            vehicleId: payload.vehicle_id || payload.vehicleId,
          }, catalogRef.current));
          void loadFleet('all', { silent: true });
          return;
        }
        if (type === WS_EVENT_TYPES.TRIP_COMPLETED && payload) {
          setVehicles((current) => upsertVehicle(current, {
            ...payload,
            tripStatus: 'completed',
            trackingStatus: 'completed',
            vehicleId: payload.vehicle_id || payload.vehicleId,
          }, catalogRef.current));
        }
      },
    });
    return () => socket.close();
  }, [loadFleet]);

  const filteredRoutes = useMemo(() => {
    const query = routeSearch.trim().toLowerCase();
    if (!query) return routes;
    return routes.filter((route) => {
      const stops = normalizeRouteStops(route.stops).map((stop) => stop.name).join(' ');
      return [route.name, route.status, stops].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [routes, routeSearch]);

  const selectedRoute = useMemo(
    () => routes.find((route) => String(route.id) === String(selectedRouteId)) || null,
    [routes, selectedRouteId],
  );

  const selectedStops = useMemo(
    () => normalizeRouteStops(selectedRoute?.stops),
    [selectedRoute],
  );

  const roadRoute = useRoadRoute(selectedStops, { enabled: Boolean(selectedRoute) });

  const filteredVehicles = useMemo(() => {
    let list = vehicles.map((vehicle) => attachRouteToLiveVehicle(vehicle, {
      routes,
      vehicles: vehicleCatalog,
    }));
    if (selectedRoute) {
      const matched = list.filter((vehicle) => vehicleMatchesRoute(vehicle, selectedRoute));
      if (matched.length) {
        list = matched;
      } else {
        // Driver GPS often has no route_id. If this route has a linked vehicle,
        // keep that bus; if there is exactly one live GPS bus, show it here.
        const withGps = list.filter((vehicle) => {
          const lat = Number(vehicle.latitude ?? vehicle.lat);
          const lng = Number(vehicle.longitude ?? vehicle.lng);
          return Number.isFinite(lat) && Number.isFinite(lng);
        });
        const routeVehicleId = String(selectedRoute.vehicleId || selectedRoute.vehicle_id || '');
        const linked = routeVehicleId
          ? withGps.filter((vehicle) => String(vehicle.vehicle_id || vehicle.vehicleId) === routeVehicleId)
          : [];
        if (linked.length) list = linked;
        else if (withGps.length === 1) list = withGps;
        else list = [];
      }
    }
    if (statusFilter !== 'all') {
      list = list.filter((vehicle) => (vehicle.tracking_status || vehicle.trackingStatus || 'offline') === statusFilter);
    }
    return list;
  }, [vehicles, selectedRoute, statusFilter, routes, vehicleCatalog]);

  const selected = useMemo(
    () => filteredVehicles.find((v) => String(v.vehicle_id || v.vehicleId) === String(selectedId)) || null,
    [filteredVehicles, selectedId],
  );

  const rotationBus = useMemo(() => {
    if (selected) return selected;
    return filteredVehicles.find((vehicle) => {
      const lat = Number(vehicle.latitude ?? vehicle.lat);
      const lng = Number(vehicle.longitude ?? vehicle.lng);
      return Number.isFinite(lat) && Number.isFinite(lng);
    }) || null;
  }, [selected, filteredVehicles]);

  const rotationTripStatus = String(
    rotationBus?.trip_status || rotationBus?.tripStatus || '',
  ).toLowerCase();
  const rotationTrackingStatus = String(
    rotationBus?.tracking_status || rotationBus?.trackingStatus || '',
  ).toLowerCase();
  const adminTripActive = Boolean(rotationBus)
    && rotationTripStatus !== 'completed'
    && rotationTrackingStatus !== 'completed';

  const rotationTripKey = rotationBus?.trip_id
    || rotationBus?.tripId
    || (adminTripActive && (rotationBus?.vehicle_id || rotationBus?.vehicleId)
      ? `vehicle-${rotationBus.vehicle_id || rotationBus.vehicleId}`
      : null);

  const { displayStops, isRotationLocked } = useTripStopRotation({
    tripKey: rotationTripKey,
    stops: selectedRoute?.stops,
    busLat: rotationBus?.latitude ?? rotationBus?.lat,
    busLng: rotationBus?.longitude ?? rotationBus?.lng,
    tripActive: adminTripActive,
    resetToken: selectedRouteId || null,
  });

  const stopFeatures = useMemo(() => {
    if (!selectedRoute) return [];
    if (displayStops.length) return displayStops;
    return stopsToMapFeatures(selectedRoute.stops);
  }, [selectedRoute, displayStops]);

  const timelineStops = isRotationLocked && displayStops.length
    ? displayStops.map((stop) => ({
      id: stop.id,
      name: stop.name,
      sequence: stop.sequence,
      displaySequence: stop.displaySequence,
      lat: stop.latitude,
      lng: stop.longitude,
      stopType: stop.stopType || stop.stop_type,
      distanceFromBusKm: stop.distanceFromBusKm,
    }))
    : selectedStops;

  const routingLabel = useMemo(() => {
    if (roadRoute.loading) return 'Building on-road path…';
    const distance = formatRouteDistance(roadRoute.distanceMeters);
    const duration = formatRouteDuration(roadRoute.durationSeconds);
    if (roadRoute.source === 'osrm' && (distance || duration)) {
      return `On-road · ${[distance, duration].filter(Boolean).join(' · ')}`;
    }
    if (roadRoute.source === 'straight') return 'Straight path (road router unavailable)';
    return '';
  }, [roadRoute]);

  useEffect(() => {
    if (selectedId && filteredVehicles.some((v) => String(v.vehicle_id || v.vehicleId) === String(selectedId))) {
      return;
    }
    const withGps = filteredVehicles.find((vehicle) => {
      const lat = Number(vehicle.latitude ?? vehicle.lat);
      const lng = Number(vehicle.longitude ?? vehicle.lng);
      return Number.isFinite(lat) && Number.isFinite(lng);
    });
    setSelectedId(withGps ? String(withGps.vehicle_id || withGps.vehicleId) : (filteredVehicles[0]
      ? String(filteredVehicles[0].vehicle_id || filteredVehicles[0].vehicleId)
      : ''));
  }, [filteredVehicles, selectedId]);

  const mappedRouteCount = useMemo(
    () => routes.filter(routeHasMappedStops).length,
    [routes],
  );

  const searchBias = useMemo(() => {
    const first = stopFeatures[0];
    if (first) return { lat: first.latitude, lng: first.longitude };
    if (schoolCenter) return { lat: schoolCenter[0], lng: schoolCenter[1] };
    return { lat: 22.9734, lng: 78.6569 };
  }, [stopFeatures, schoolCenter]);

  const loading = routesLoading && fleetLoading;
  const mappedStopCount = selectedStops.filter(
    (stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng),
  ).length;

  const activeTripId = selected?.trip_id || selected?.tripId || rotationBus?.trip_id || rotationBus?.tripId || '';

  const openStopDetails = useCallback(async (stop) => {
    setSelectedStop(stop);
    setStopError('');
    setStopStudents([]);
    setStopCounts(null);
    if (!activeTripId) {
      setStopError('Select a bus with an active trip to load students for this stop.');
      return;
    }
    setStopLoading(true);
    try {
      const result = await getTripStopStudents(activeTripId, stop.id);
      setStopStudents(result.students || []);
      setStopCounts(result.counts || null);
    } catch (err) {
      setStopError(friendlyTransportError(err));
      toast(friendlyTransportError(err), 'error');
    } finally {
      setStopLoading(false);
    }
  }, [activeTripId, toast]);

  useEffect(() => {
    if (!activeTripId) {
      setTripStatuses([]);
      return undefined;
    }
    let cancelled = false;
    setTripStatusesLoading(true);
    getTripStudentTransportStatuses(activeTripId)
      .then((list) => {
        if (!cancelled) setTripStatuses(list || []);
      })
      .catch(() => {
        if (!cancelled) setTripStatuses([]);
      })
      .finally(() => {
        if (!cancelled) setTripStatusesLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeTripId]);

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="Live Bus Tracking"
          subtitle="One route at a time: pick the route → see the stop path on the map → track buses on that route."
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#c5c6cd] bg-white px-3 py-1 text-xs font-semibold text-[#344054]">
                {socketStatus.state === 'connected'
                  ? <Signal size={14} className="text-emerald-600" />
                  : <SignalZero size={14} className="text-rose-600" />}
                {socketStatus.state === 'connected' ? 'Live connected' : `Live ${socketStatus.state}`}
              </span>
              <Button variant="secondary" onClick={() => { void loadRoutes(); void loadFleet(); }}>
                <RefreshCw size={14} /> Refresh
              </Button>
              <Button variant="secondary" onClick={() => setGpsOpen(true)}>
                GPS device setup
              </Button>
              <Link to="../trips" relative="path">
                <Button variant="secondary">
                  <RouteIcon size={14} /> Trip history
                </Button>
              </Link>
              <Link to="../assignments" relative="path">
                <Button variant="secondary">
                  <RouteIcon size={14} /> Student assignments
                </Button>
              </Link>
              <Link to="../routes" relative="path">
                <Button variant="secondary">
                  <RouteIcon size={14} /> Manage routes
                </Button>
              </Link>
            </div>
          )}
        />

        <div className="mb-4 hidden gap-3 xl:grid xl:grid-cols-3">
          <div className="rounded-xl border border-[#d0d5dd] bg-white px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#667085]">1 · Choose route</p>
            <p className="mt-1 text-sm text-[#344054]">Select which bus path to display.</p>
          </div>
          <div className="rounded-xl border border-[#d0d5dd] bg-white px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#667085]">2 · See road path</p>
            <p className="mt-1 text-sm text-[#344054]">Stops connect along real roads with travel direction.</p>
          </div>
          <div className="rounded-xl border border-[#d0d5dd] bg-white px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#667085]">3 · Track buses</p>
            <p className="mt-1 text-sm text-[#344054]">Bus markers appear only from real GPS.</p>
          </div>
        </div>

        {fleetError && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Live GPS feed unavailable: {fleetError}. You can still view route paths from saved stops.
            {' '}
            <Link className="font-semibold text-[#0058be] underline" to="../routes" relative="path">
              Edit routes
            </Link>
          </div>
        )}

        {mappedRouteCount === 0 && !routesLoading && (
          <div className="mb-4 rounded-xl border border-[#d0d5dd] bg-[#f8f9ff] px-4 py-3 text-sm text-[#344054]">
            No route has map locations yet. Go to{' '}
            <Link className="font-semibold text-[#0058be] underline" to="../routes" relative="path">
              Transport Routes
            </Link>
            , search each stop, save, then return here.
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading routes and fleet…" />
        ) : routes.length === 0 ? (
          <div className="sb-card p-8 text-center">
            <MapPinned className="mx-auto text-[#0058be]" size={28} />
            <h3 className="mt-3 text-lg font-bold text-[#0b1c30]">Create a route first</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#667085]">
              Live tracking shows one clear route path at a time. Add stops with map locations, then open this page again.
            </p>
            <Link to="../routes" relative="path" className="mt-4 inline-block">
              <Button>Go to Transport Routes</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[260px_minmax(0,1fr)_280px]">
            <Panel step="1" title="Choose route" className="max-h-[220px] 2xl:max-h-[min(70vh,720px)]">
              <div className="relative mb-3">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-[#667085]">
                  <Search size={14} />
                </span>
                <input
                  className="h-10 w-full rounded-lg border border-[#c5c6cd] bg-white text-sm outline-none focus:border-[#0058be]"
                  style={{ paddingLeft: '2.25rem', paddingRight: '0.75rem' }}
                  placeholder="Search route name…"
                  value={routeSearch}
                  onChange={(event) => setRouteSearch(event.target.value)}
                />
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {filteredRoutes.map((route) => {
                  const stops = normalizeRouteStops(route.stops);
                  const mapped = stops.filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng)).length;
                  const active = String(selectedRouteId) === String(route.id);
                  const busCount = vehicles
                    .map((vehicle) => attachRouteToLiveVehicle(vehicle, {
                      routes,
                      vehicles: vehicleCatalog,
                    }))
                    .filter((vehicle) => vehicleMatchesRoute(vehicle, route)).length;
                  return (
                    <button
                      key={route.id}
                      type="button"
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        active
                          ? 'border-[#0058be] bg-[#eef4ff] shadow-sm'
                          : 'border-[#d0d5dd] bg-white hover:border-[#98a2b3]'
                      }`}
                      onClick={() => setSelectedRouteId(String(route.id))}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-[#0b1c30]">{route.name}</p>
                          <p className="mt-1 text-xs text-[#667085]">
                            {stops.length} stops
                            {mapped > 0 ? (
                              <span className="text-emerald-700"> · ready on map</span>
                            ) : (
                              <span className="text-amber-700"> · add locations</span>
                            )}
                          </p>
                          {stops.length > 0 && (
                            <div className="mt-2 hidden sm:block">
                              <RouteStopTimeline stops={stops} compact />
                            </div>
                          )}
                        </div>
                        {busCount > 0 && (
                          <span className="shrink-0 rounded-full bg-[#0b1c30] px-2 py-0.5 text-[10px] font-bold text-white">
                            {busCount} bus
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Panel>

            <div className="order-first min-w-0 space-y-4 2xl:order-none">
              <div className="sb-card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eaecf0] bg-[#f8f9ff] px-3 py-3 sm:px-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#0058be]">Step 2</p>
                    <h3 className="truncate text-sm font-bold text-[#0b1c30]">
                      {selectedRoute ? `Map · ${selectedRoute.name}` : 'Map · Select a route'}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#475467]">
                    <span className="rounded-full border border-[#d0d5dd] bg-white px-2.5 py-1">
                      {mappedStopCount}/{selectedStops.length} stops
                    </span>
                    <span className="rounded-full border border-[#d0d5dd] bg-white px-2.5 py-1">
                      {filteredVehicles.length} bus{filteredVehicles.length === 1 ? '' : 'es'}
                    </span>
                  </div>
                </div>
                <div className="h-[min(62vh,520px)] w-full sm:h-[min(68vh,560px)] lg:h-[min(70vh,640px)] 2xl:h-[620px]">
                  <LiveBusMap
                    vehicles={filteredVehicles}
                    selectedVehicleId={selectedId}
                    routeGeoJson={roadRoute.geoJson}
                    stopFeatures={stopFeatures}
                    fitToken={`${selectedRouteId}:${rotationTripKey || ''}:${roadRoute.source}:${roadRoute.distanceMeters}:${stopFeatures.map((stop) => `${stop.id}:${stop.latitude}:${stop.longitude}:${stop.displaySequence ?? stop.sequence ?? ''}`).join('|')}`}
                    defaultCenter={schoolCenter}
                    searchBias={searchBias}
                    routingLabel={routingLabel}
                    onSelectVehicle={(vehicle) => setSelectedId(String(vehicle.vehicle_id || vehicle.vehicleId))}
                    onSelectStop={(stop) => void openStopDetails(stop)}
                    emptyTitle={selectedRoute ? `${selectedRoute.name} needs map locations` : 'Select a route'}
                    emptyHint="Open Manage routes, search each stop, save, then refresh this page. Tap a stop marker for assigned students."
                    className="h-full w-full border-0"
                  />
                </div>
              </div>

              {activeTripId ? (
                <div className="sb-card overflow-hidden p-4">
                  <h3 className="mb-3 text-sm font-bold text-[#0b1c30]">Trip student transport status</h3>
                  <TripStudentStatusTable
                    students={tripStatuses}
                    loading={tripStatusesLoading}
                    emptyText="No student pickup/drop-off marks for this trip yet (or API not deployed)."
                  />
                </div>
              ) : null}
            </div>

            <div className="flex max-h-none flex-col gap-4 2xl:max-h-[min(70vh,720px)]">
              <Panel step="2b" title="Stop order on this route" className="min-h-0 flex-1 overflow-hidden">
                {selectedRoute ? (
                  <>
                    <div className="mb-3 rounded-lg bg-[#f8f9ff] px-3 py-2 text-xs text-[#475467]">
                      Morning {selectedRoute.morningStart || '—'}
                      {' · '}
                      Evening {selectedRoute.eveningStart || '—'}
                      {' · '}
                      <span className="capitalize">{selectedRoute.status || 'active'}</span>
                    </div>
                    <div className="min-h-0 max-h-[240px] flex-1 overflow-y-auto 2xl:max-h-none">
                      <RouteStopTimeline
                        stops={timelineStops}
                        title={isRotationLocked ? 'Stop order (from nearest)' : 'Stop order'}
                        emptyText="This route has no stops. Add them under Manage routes."
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[#667085]">Select a route on the left to see its stop order.</p>
                )}
              </Panel>

              <Panel step="3" title="Buses on this route" className="min-h-0 flex-1 overflow-hidden">
                <div className="mb-3">
                  <Select
                    label="Bus status"
                    value={statusFilter}
                    options={FILTERS}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  />
                </div>
                {fleetLoading ? (
                  <p className="text-sm text-[#667085]">Loading live positions…</p>
                ) : (
                  <div className="min-h-0 max-h-[220px] flex-1 space-y-2 overflow-y-auto 2xl:max-h-none">
                    {filteredVehicles.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-[#c5c6cd] bg-[#f8f9ff] px-3 py-3 text-sm text-[#667085]">
                        No live GPS on this route yet. When the driver starts sharing location, the bus appears here within a few seconds. The blue path still shows from saved stops.
                      </p>
                    ) : filteredVehicles.map((vehicle) => {
                      const id = String(vehicle.vehicle_id || vehicle.vehicleId);
                      const status = vehicle.tracking_status || vehicle.trackingStatus || 'offline';
                      const lat = Number(vehicle.latitude ?? vehicle.lat);
                      const lng = Number(vehicle.longitude ?? vehicle.lng);
                      const hasGps = Number.isFinite(lat) && Number.isFinite(lng);
                      const speed = Number(vehicle.speed_kmh);
                      const speedLabel = Number.isFinite(speed) && speed >= 1
                        ? ` · ${speed.toFixed(0)} km/h`
                        : (status === 'running' && hasGps ? ' · live GPS' : '');
                      return (
                        <button
                          key={id}
                          type="button"
                          className={`w-full rounded-xl border px-3 py-2.5 text-left ${
                            selectedId === id ? 'border-[#0058be] bg-[#eef4ff]' : 'border-[#d0d5dd] bg-white'
                          }`}
                          onClick={() => setSelectedId(id)}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[status] || STATUS_DOT.offline}`} />
                            <Bus size={14} className="text-[#0058be]" />
                            <span className="font-semibold text-[#0b1c30]">
                              {vehicle.vehicle_number || vehicle.vehicleNumber || id}
                            </span>
                          </div>
                          <p className="mt-1 text-xs capitalize text-[#667085]">
                            {String(status).replace('_', ' ')}
                            {speedLabel}
                            {!hasGps ? ' · waiting for GPS' : ''}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selected && (
                  <div className="mt-3 border-t border-[#eaecf0] pt-3 text-sm">
                    <p className="text-xs font-bold uppercase text-[#667085]">Selected bus</p>
                    <p className="mt-1 font-semibold text-[#0b1c30]">
                      {selected.vehicle_number || selected.vehicleNumber}
                    </p>
                    <p className="mt-1 text-xs text-[#667085]">
                      Updated {selected.updated_at ? new Date(selected.updated_at).toLocaleString() : 'never'}
                    </p>
                    <p className="mt-1 text-xs text-[#667085]">
                      {selected.latitude != null && selected.longitude != null
                        ? `${Number(selected.latitude).toFixed(5)}, ${Number(selected.longitude).toFixed(5)}`
                        : 'No coordinates yet'}
                    </p>
                  </div>
                )}
              </Panel>
            </div>
          </div>
        )}

        <GpsDeviceSetupModal open={gpsOpen} onClose={() => setGpsOpen(false)} />
        <StopDetailsModal
          open={Boolean(selectedStop)}
          onClose={() => setSelectedStop(null)}
          stop={selectedStop}
          students={stopStudents}
          counts={stopCounts}
          routeName={selectedRoute?.name || selected?.route_name || selected?.routeName}
          direction={selected?.direction || 'morning'}
          loading={stopLoading}
          error={stopError}
          viewerRole="admin"
        />
      </PageTransition>
    </DashboardLayout>
  );
}
