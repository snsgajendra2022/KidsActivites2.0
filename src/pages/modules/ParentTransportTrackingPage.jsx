import { useEffect, useState } from 'react';
import { Bus, Clock, MapPin, Signal, SignalZero } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { LoadingState, PageHeader } from '../../components/ui/index.jsx';
import LiveBusMap from '../../components/transport/LiveBusMap.jsx';
import { fetchParentTransportLive } from '../../services/transportTracking/trackingApi.js';
import { createTrackingSocket } from '../../services/transportTracking/trackingSocket.js';

export default function ParentTransportTrackingPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socketStatus, setSocketStatus] = useState({ state: 'idle' });

  useEffect(() => {
    let cancelled = false;
    fetchParentTransportLive()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Unable to load live tracking.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!data?.vehicleId) return undefined;
    const socket = createTrackingSocket({
      vehicleId: data.vehicleId,
      onStatus: setSocketStatus,
      onEvent: (event) => {
        if (event?.type !== 'vehicle.location_updated' || !event.data) return;
        if (String(event.data.vehicleId || event.data.vehicle_id) !== String(data.vehicleId)) return;
        setData((current) => ({
          ...current,
          lat: event.data.latitude,
          lng: event.data.longitude,
          speedKmh: event.data.speedKmh,
          heading: event.data.heading,
          status: event.data.trackingStatus || current.status,
          etaMinutes: event.data.eta?.etaMinutes ?? current.etaMinutes,
          nextStop: event.data.eta?.nextStopName || current.nextStop,
          lastStop: event.data.eta?.lastStopName || current.lastStop,
          updatedAt: event.data.updatedAt || new Date().toISOString(),
        }));
      },
    });
    return () => socket.close();
  }, [data?.vehicleId]);

  const mapVehicles = data?.lat != null && data?.lng != null
    ? [{
      vehicle_id: data.vehicleId,
      vehicle_number: data.vehicleNumber,
      latitude: data.lat,
      longitude: data.lng,
      heading: data.heading,
      tracking_status: data.status,
      updated_at: data.updatedAt,
    }]
    : [];

  return (
    <AppLayout>
      <PageTransition>
        <PageHeader
          title="Live Bus Tracking"
          subtitle="Only your child’s assigned bus is visible. Positions come from authenticated GPS devices or the driver app."
          actions={(
            <span className="inline-flex items-center gap-1 rounded-full border border-[#c5c6cd] bg-white px-3 py-1 text-xs font-semibold text-[#344054]">
              {socketStatus.state === 'connected'
                ? <Signal size={14} className="text-emerald-600" />
                : <SignalZero size={14} className="text-rose-600" />}
              Live {socketStatus.state}
            </span>
          )}
        />

        {loading ? (
          <LoadingState message="Loading live location…" />
        ) : error ? (
          <div className="sb-card p-6 text-sm text-[#b42318]">
            {error}
            <p className="mt-2 text-[#667085]">
              If no assignment exists, ask the school to link your child to a route/stop/vehicle.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="sb-card p-5 md:col-span-2">
              <div className="mb-4 flex items-center gap-2 text-[#0058be]">
                <Bus size={18} />
                <h2 className="text-lg font-bold text-[#0b1c30]">{data.routeName || 'Assigned route'}</h2>
              </div>
              <div className="mb-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#667085]">Vehicle</p>
                  <p className="mt-1 font-semibold">{data.vehicleNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#667085]">Assigned stop</p>
                  <p className="mt-1 font-semibold">{data.assignedStop || data.nextStop || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#667085]">Last stop</p>
                  <p className="mt-1 font-semibold">{data.lastStop || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#667085]">Next stop</p>
                  <p className="mt-1 font-semibold">{data.nextStop || '—'}</p>
                </div>
              </div>
              {mapVehicles.length ? (
                <LiveBusMap vehicles={mapVehicles} className="h-[360px] border border-[#d0d5dd]" />
              ) : (
                <div className="rounded-xl border border-dashed border-[#c5d0e0] bg-[#f7f9fc] p-8 text-center text-sm text-[#667085]">
                  <MapPin className="mx-auto mb-2 text-[#0058be]" />
                  Waiting for the first authenticated GPS fix for this bus.
                </div>
              )}
            </div>
            <div className="sb-card p-5">
              <div className="flex items-center gap-2 text-[#0058be]">
                <Clock size={18} />
                <h3 className="font-bold text-[#0b1c30]">ETA</h3>
              </div>
              <p className="mt-4 text-3xl font-black text-[#0b1c30]">
                {data.etaMinutes != null ? `${data.etaMinutes} min` : '—'}
              </p>
              <p className="mt-2 text-sm capitalize text-[#667085]">
                Status: {String(data.status || 'offline').replace('_', ' ')}
              </p>
              <p className="mt-4 text-xs text-[#8a93a3]">
                {data.updatedAt
                  ? `Updated ${new Date(data.updatedAt).toLocaleTimeString()}`
                  : 'No GPS update yet'}
              </p>
            </div>
          </div>
        )}
      </PageTransition>
    </AppLayout>
  );
}
