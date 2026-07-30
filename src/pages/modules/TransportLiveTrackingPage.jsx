import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bus, RefreshCw, Signal, SignalZero } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { LoadingState, PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import LiveBusMap from '../../components/transport/LiveBusMap.jsx';
import { fetchAdminFleetLive } from '../../services/transportTracking/trackingApi.js';
import { createTrackingSocket } from '../../services/transportTracking/trackingSocket.js';
import { useToast } from '../../context/ToastContext.jsx';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'running', label: 'Running' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'warning', label: 'Warning' },
  { value: 'offline', label: 'Offline' },
];

function upsertVehicle(list, update) {
  const id = String(update.vehicleId || update.vehicle_id);
  const next = [...list];
  const index = next.findIndex((item) => String(item.vehicle_id || item.vehicleId) === id);
  const merged = {
    ...(index >= 0 ? next[index] : {}),
    vehicle_id: id,
    latitude: update.latitude,
    longitude: update.longitude,
    speed_kmh: update.speedKmh ?? update.speed_kmh,
    heading: update.heading,
    tracking_status: update.trackingStatus || update.tracking_status,
    updated_at: update.updatedAt || update.updated_at || new Date().toISOString(),
    trip_id: update.tripId || update.trip_id,
    eta: update.eta || (index >= 0 ? next[index].eta : null),
  };
  if (index >= 0) next[index] = { ...next[index], ...merged };
  else next.push(merged);
  return next;
}

export default function TransportLiveTrackingPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState('all');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socketStatus, setSocketStatus] = useState({ state: 'idle' });
  const [selectedId, setSelectedId] = useState('');

  const loadFleet = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminFleetLive(filter);
      setVehicles(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Unable to load live fleet.');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch fleet snapshot when filter changes
    void loadFleet();
  }, [loadFleet]);

  useEffect(() => {
    const socket = createTrackingSocket({
      onStatus: setSocketStatus,
      onEvent: (event) => {
        if (event?.type === 'vehicle.location_updated' && event.data) {
          setVehicles((current) => upsertVehicle(current, event.data));
          return;
        }
        if (event?.type === 'vehicle.tracking_warning' || event?.type === 'vehicle.tracking_offline') {
          setVehicles((current) => upsertVehicle(current, {
            ...event.data,
            trackingStatus: event.type === 'vehicle.tracking_offline' ? 'offline' : 'warning',
            vehicleId: event.data?.vehicle_id || event.data?.vehicleId,
            latitude: event.data?.latitude,
            longitude: event.data?.longitude,
            updatedAt: event.data?.updated_at,
          }));
        }
      },
    });
    return () => socket.close();
  }, []);

  const selected = useMemo(
    () => vehicles.find((v) => String(v.vehicle_id || v.vehicleId) === String(selectedId)) || null,
    [vehicles, selectedId],
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return vehicles;
    return vehicles.filter((v) => (v.tracking_status || 'offline') === filter);
  }, [vehicles, filter]);

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="Live Bus Tracking"
          subtitle="Real GPS positions via authenticated devices/driver apps. Updates stream over WebSocket."
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#c5c6cd] bg-white px-3 py-1 text-xs font-semibold text-[#344054]">
                {socketStatus.state === 'connected' ? <Signal size={14} className="text-emerald-600" /> : <SignalZero size={14} className="text-rose-600" />}
                WS {socketStatus.state}
              </span>
              <Button variant="secondary" onClick={() => loadFleet()}>
                <RefreshCw size={14} /> Refresh
              </Button>
            </div>
          )}
        />

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <Select
            label="Fleet filter"
            value={filter}
            options={FILTERS}
            onChange={(event) => setFilter(event.target.value)}
          />
        </div>

        {loading ? (
          <LoadingState message="Loading fleet locations…" />
        ) : error ? (
          <div className="sb-card p-6 text-sm text-[#b42318]">
            {error}
            <p className="mt-2 text-[#667085]">
              This page calls your existing Spring Boot API (`VITE_API_URL`) at
              {' '}<code>/api/v1/admin/transport/live</code>. Implement that endpoint
              in the Java backend — no separate tracking URL is required. Coordinates
              are never invented on the frontend.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
            <LiveBusMap
              vehicles={filtered}
              selectedVehicleId={selectedId}
              onSelectVehicle={(vehicle) => setSelectedId(String(vehicle.vehicle_id || vehicle.vehicleId))}
              className="h-[520px] border border-[#d0d5dd] bg-white"
            />

            <div className="space-y-3">
              <div className="sb-card p-4">
                <h3 className="mb-3 flex items-center gap-2 font-bold text-[#0b1c30]">
                  <Bus size={16} className="text-[#0058be]" /> Fleet ({filtered.length})
                </h3>
                <div className="max-h-[280px] space-y-2 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="text-sm text-[#667085]">No vehicles match this filter.</p>
                  ) : filtered.map((vehicle) => {
                    const id = String(vehicle.vehicle_id || vehicle.vehicleId);
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                          selectedId === id ? 'border-[#0058be] bg-[#eef4ff]' : 'border-[#d0d5dd] bg-white'
                        }`}
                        onClick={() => setSelectedId(id)}
                      >
                        <div className="font-semibold text-[#0b1c30]">
                          {vehicle.vehicle_number || vehicle.vehicleNumber || id}
                        </div>
                        <div className="mt-1 text-xs capitalize text-[#667085]">
                          {(vehicle.tracking_status || 'offline').replace('_', ' ')}
                          {vehicle.speed_kmh != null ? ` · ${Number(vehicle.speed_kmh).toFixed(0)} km/h` : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="sb-card p-4">
                <h3 className="mb-3 font-bold text-[#0b1c30]">Selected bus</h3>
                {!selected ? (
                  <p className="text-sm text-[#667085]">Select a bus to inspect trip details.</p>
                ) : (
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-xs font-bold uppercase text-[#667085]">Vehicle</dt>
                      <dd className="font-semibold">{selected.vehicle_number || selected.vehicleNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase text-[#667085]">Route</dt>
                      <dd className="font-semibold">{selected.route_name || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase text-[#667085]">Students</dt>
                      <dd className="font-semibold">{selected.student_count ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase text-[#667085]">Trip</dt>
                      <dd className="font-semibold capitalize">{selected.trip_status || 'idle'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase text-[#667085]">Speed</dt>
                      <dd className="font-semibold">
                        {selected.speed_kmh != null ? `${Number(selected.speed_kmh).toFixed(1)} km/h` : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase text-[#667085]">Last update</dt>
                      <dd className="font-semibold">
                        {selected.updated_at ? new Date(selected.updated_at).toLocaleString() : 'Never'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase text-[#667085]">Coordinates</dt>
                      <dd className="font-semibold">
                        {selected.latitude != null && selected.longitude != null
                          ? `${Number(selected.latitude).toFixed(5)}, ${Number(selected.longitude).toFixed(5)}`
                          : 'Unavailable'}
                      </dd>
                    </div>
                  </dl>
                )}
                <Button
                  className="mt-4 w-full"
                  variant="secondary"
                  onClick={() => toast('Device provisioning is available via POST /admin/transport/gps-devices', 'info')}
                >
                  GPS device setup guide
                </Button>
              </div>
            </div>
          </div>
        )}
      </PageTransition>
    </DashboardLayout>
  );
}
