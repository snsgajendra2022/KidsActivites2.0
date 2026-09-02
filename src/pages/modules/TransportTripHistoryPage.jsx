import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, RefreshCw } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { EmptyState, LoadingState, PageHeader, SearchField } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import { ResponsiveDataTable } from '../../components/ui/DataTable.jsx';
import { fetchTripHistory } from '../../services/transportTracking/trackingApi.js';
import { transportRouteService, transportVehicleService } from '../../services/schoolModules/index.js';
import { listDrivers } from '../../services/driverService.js';
import '../../styles/admin-modules.css';

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'started', label: 'Started / active' },
  { value: 'active', label: 'Active' },
  { value: 'en_route', label: 'En route' },
];

function pickString(...values) {
  for (const value of values) {
    if (value == null || value === '') continue;
    const text = String(value).trim();
    if (!text) continue;
    return text;
  }
  return '';
}

function looksLikeId(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) return true;
  if (/^[0-9a-f]{24}$/i.test(text)) return true;
  return false;
}

function displayLabel(value, fallback = '—') {
  const text = pickString(value);
  if (!text || looksLikeId(text)) return fallback;
  return text;
}

function formatWhen(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function titleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || '—';
}

function statusBadgeClass(status) {
  const key = String(status || '').toLowerCase();
  if (['completed', 'complete', 'done', 'finished'].includes(key)) return 'sb-status-badge--success';
  if (['active', 'started', 'en_route', 'in_progress', 'running'].includes(key)) return 'sb-status-badge--info';
  if (['cancelled', 'canceled', 'failed', 'aborted'].includes(key)) return 'sb-status-badge--danger';
  if (['paused', 'delayed', 'pending'].includes(key)) return 'sb-status-badge--warning';
  return 'sb-status-badge--default';
}

function normalizeTrip(item) {
  if (!item || typeof item !== 'object') return null;
  const id = pickString(item.id, item.tripId, item.trip_id);
  if (!id) return null;
  const vehicle = item.vehicle && typeof item.vehicle === 'object' ? item.vehicle : {};
  const route = item.route && typeof item.route === 'object' ? item.route : {};
  const driver = item.driver && typeof item.driver === 'object' ? item.driver : {};
  const vehicleNumber = pickString(
    item.vehicleNumber,
    item.vehicle_number,
    vehicle.vehicleNumber,
    vehicle.number,
    vehicle.name,
  );
  const routeName = pickString(item.routeName, item.route_name, route.name, route.routeName);
  const driverName = pickString(
    item.driverName,
    item.driver_name,
    driver.name,
    driver.fullName,
    driver.full_name,
  );
  return {
    id,
    vehicleId: pickString(item.vehicleId, item.vehicle_id, vehicle.id),
    vehicleNumber: looksLikeId(vehicleNumber) ? '' : vehicleNumber,
    routeId: pickString(item.routeId, item.route_id, route.id),
    routeName: looksLikeId(routeName) ? '' : routeName,
    driverId: pickString(
      item.driverId,
      item.driver_id,
      item.driverUserId,
      item.driver_user_id,
      driver.id,
      driver.userId,
      driver.user_id,
    ),
    driverName: looksLikeId(driverName) ? '' : driverName,
    direction: pickString(item.direction, '—'),
    status: pickString(item.status, 'unknown'),
    startedAt: pickString(item.startedAt, item.started_at),
    completedAt: pickString(item.completedAt, item.completed_at),
  };
}

function indexById(rows, ...idKeys) {
  const map = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    if (!row || typeof row !== 'object') return;
    idKeys.forEach((key) => {
      const id = pickString(row[key], row.id);
      if (id) map.set(String(id), row);
    });
  });
  return map;
}

function enrichTrip(trip, catalogs) {
  if (!trip) return null;
  const vehicle = catalogs.vehicles.get(String(trip.vehicleId || '')) || null;
  const route = catalogs.routes.get(String(trip.routeId || '')) || null;
  const driverFromId = catalogs.drivers.get(String(trip.driverId || '')) || null;
  const driverFromVehicle = vehicle
    ? catalogs.drivers.get(String(vehicle.driverUserId || vehicle.driverId || ''))
    : null;

  const vehicleNumber = displayLabel(
    trip.vehicleNumber
    || vehicle?.vehicleNumber
    || vehicle?.number
    || vehicle?.name,
  );
  const routeName = displayLabel(trip.routeName || route?.name || route?.routeName);
  const driverName = displayLabel(
    trip.driverName
    || driverFromId?.name
    || driverFromVehicle?.name
    || vehicle?.driverName,
  );

  return {
    ...trip,
    vehicleNumber: vehicleNumber === '—' ? '' : vehicleNumber,
    routeName: routeName === '—' ? '' : routeName,
    driverName: driverName === '—' ? '' : driverName,
    vehicleLabel: vehicleNumber,
    routeLabel: routeName,
    driverLabel: driverName,
  };
}

export default function TransportTripHistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const [trips, vehicles, routes, drivers] = await Promise.all([
        fetchTripHistory(params),
        transportVehicleService.list().catch(() => []),
        transportRouteService.list().catch(() => []),
        listDrivers().catch(() => []),
      ]);

      const catalogs = {
        vehicles: indexById(vehicles, 'id', 'vehicleId'),
        routes: indexById(routes, 'id', 'routeId'),
        drivers: indexById(drivers, 'id', 'userId', 'driverId'),
      };

      setItems(
        (Array.isArray(trips) ? trips : [])
          .map(normalizeTrip)
          .map((trip) => enrichTrip(trip, catalogs))
          .filter(Boolean),
      );
    } catch (err) {
      setItems([]);
      if (err?.status === 401 || err?.status === 403) {
        setError('You are not authorized to view trip history.');
      } else {
        setError(err?.message || 'Unable to load trip history.');
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((trip) => (
      [
        trip.vehicleLabel,
        trip.routeLabel,
        trip.driverLabel,
        trip.direction,
        trip.status,
        trip.id,
      ].some((value) => String(value || '').toLowerCase().includes(query))
    ));
  }, [items, search]);

  const columns = useMemo(() => ([
    {
      key: 'vehicleLabel',
      label: 'Vehicle',
      primary: true,
      render: (row) => row.vehicleLabel || '—',
    },
    {
      key: 'routeLabel',
      label: 'Route',
      render: (row) => row.routeLabel || '—',
    },
    {
      key: 'driverLabel',
      label: 'Driver',
      muted: true,
      render: (row) => row.driverLabel || '—',
    },
    {
      key: 'direction',
      label: 'Direction',
      render: (row) => titleCase(row.direction),
    },
    {
      key: 'status',
      label: 'Status',
      badge: true,
      render: (row) => (
        <span className={`sb-status-badge ${statusBadgeClass(row.status)}`}>
          {titleCase(row.status)}
        </span>
      ),
    },
    {
      key: 'startedAt',
      label: 'Started',
      render: (row) => formatWhen(row.startedAt),
    },
    {
      key: 'completedAt',
      label: 'Completed',
      render: (row) => formatWhen(row.completedAt),
    },
  ]), []);

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="Trip history"
          subtitle="Completed and recent transport trips for this school."
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => void load()}>
                <RefreshCw size={14} /> Refresh
              </Button>
              <Link to="../live" relative="path">
                <Button variant="secondary">Live tracking</Button>
              </Link>
            </div>
          )}
        />

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="w-48">
            <Select
              label="Status"
              value={statusFilter}
              options={STATUS_FILTERS}
              onChange={(event) => setStatusFilter(event.target.value)}
            />
          </div>
          <div className="min-w-[220px] flex-1">
            <SearchField
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search vehicle, route, driver…"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading trip history…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={History}
            title="No trips yet"
            description="Trip history appears after drivers start and complete runs."
          />
        ) : (
          <ResponsiveDataTable columns={columns} data={filtered} emptyMessage="No trips match your search." />
        )}
      </PageTransition>
    </DashboardLayout>
  );
}
