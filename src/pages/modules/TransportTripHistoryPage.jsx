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
import '../../styles/admin-modules.css';

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'started', label: 'Started / active' },
  { value: 'en_route', label: 'En route' },
];

function pickString(...values) {
  for (const value of values) {
    if (value == null || value === '') continue;
    return String(value);
  }
  return '';
}

function formatWhen(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function normalizeTrip(item) {
  if (!item || typeof item !== 'object') return null;
  const id = pickString(item.id, item.tripId, item.trip_id);
  if (!id) return null;
  const vehicle = item.vehicle && typeof item.vehicle === 'object' ? item.vehicle : {};
  const route = item.route && typeof item.route === 'object' ? item.route : {};
  const driver = item.driver && typeof item.driver === 'object' ? item.driver : {};
  return {
    id,
    vehicleId: pickString(item.vehicleId, item.vehicle_id, vehicle.id),
    vehicleNumber: pickString(
      item.vehicleNumber,
      item.vehicle_number,
      vehicle.vehicleNumber,
      vehicle.number,
      item.vehicleId,
      item.vehicle_id,
    ),
    routeId: pickString(item.routeId, item.route_id, route.id),
    routeName: pickString(item.routeName, item.route_name, route.name),
    driverName: pickString(item.driverName, item.driver_name, driver.name),
    direction: pickString(item.direction, '—'),
    status: pickString(item.status, 'unknown'),
    startedAt: pickString(item.startedAt, item.started_at),
    completedAt: pickString(item.completedAt, item.completed_at),
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
      const data = await fetchTripHistory(params);
      setItems((Array.isArray(data) ? data : []).map(normalizeTrip).filter(Boolean));
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
      [trip.vehicleNumber, trip.routeName, trip.driverName, trip.direction, trip.status, trip.id]
        .some((value) => String(value || '').toLowerCase().includes(query))
    ));
  }, [items, search]);

  const columns = useMemo(() => ([
    {
      key: 'vehicleNumber',
      label: 'Vehicle',
      primary: true,
      render: (row) => row.vehicleNumber || row.vehicleId || '—',
    },
    {
      key: 'routeName',
      label: 'Route',
      render: (row) => row.routeName || row.routeId || '—',
    },
    {
      key: 'driverName',
      label: 'Driver',
      muted: true,
      render: (row) => row.driverName || '—',
    },
    {
      key: 'direction',
      label: 'Direction',
      render: (row) => String(row.direction || '—').replace(/_/g, ' '),
    },
    {
      key: 'status',
      label: 'Status',
      badge: true,
      render: (row) => (
        <span className="sb-status-badge sb-status-badge--neutral capitalize">
          {String(row.status || 'unknown').replace(/_/g, ' ')}
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
            description="Trip history appears after drivers start and complete runs. Soft-empty when the trips API is not deployed yet."
          />
        ) : (
          <ResponsiveDataTable columns={columns} data={filtered} emptyMessage="No trips match your search." />
        )}
      </PageTransition>
    </DashboardLayout>
  );
}
