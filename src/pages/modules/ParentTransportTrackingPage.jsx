import { useCallback, useEffect, useState } from 'react';
import { Bus, Clock, MapPin, Signal, SignalZero } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { LoadingState, PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import LiveBusMap from '../../components/transport/LiveBusMap.jsx';
import { fetchParentTransportLive } from '../../services/transportTracking/trackingApi.js';
import { createTrackingSocket } from '../../services/transportTracking/trackingSocket.js';
import {
  fetchParentTransportAddress,
  updateParentChildTransportAddress,
} from '../../services/transportAddressService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  isTransportAddressComplete,
  normalizeTransportAddress,
} from '../../utils/transportAddress.js';

export default function ParentTransportTrackingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socketStatus, setSocketStatus] = useState({ state: 'idle' });
  const [addressInfo, setAddressInfo] = useState(null);
  const [addressForm, setAddressForm] = useState({
    currentAddress: '',
    city: '',
    state: '',
    pinCode: '',
    country: 'India',
  });
  const [savingAddress, setSavingAddress] = useState(false);

  const loadAddress = useCallback(async () => {
    try {
      const info = await fetchParentTransportAddress(user);
      setAddressInfo(info);
      if (info?.address) setAddressForm(normalizeTransportAddress(info.address));
    } catch {
      setAddressInfo(null);
    }
  }, [user]);

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
    void loadAddress();
    return () => { cancelled = true; };
  }, [loadAddress]);

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

  const needsAddress = addressInfo && !addressInfo.addressComplete;

  const handleSaveAddress = async () => {
    if (!addressInfo?.studentId && !addressInfo?.applicationId) {
      toast('No child linked to this parent account.', 'warning');
      return;
    }
    if (!isTransportAddressComplete(addressForm)) {
      toast('Street address and city or PIN code are required.', 'warning');
      return;
    }
    setSavingAddress(true);
    try {
      const childId = addressInfo.applicationId || addressInfo.studentId;
      const updated = await updateParentChildTransportAddress(childId, addressForm);
      setAddressInfo((current) => ({
        ...current,
        ...updated,
        addressComplete: true,
      }));
      toast('Home address saved. School can match the correct pickup stop.', 'success');
    } catch (err) {
      toast(err?.message || 'Unable to save address.', 'error');
    } finally {
      setSavingAddress(false);
    }
  };

  return (
    <AppLayout>
      <PageTransition>
        <PageHeader
          title="Live Bus Tracking"
          subtitle="Your child’s assigned vehicle and pickup stop. Keep the home address up to date for correct routing."
          actions={(
            <span className="inline-flex items-center gap-1 rounded-full border border-[#c5c6cd] bg-white px-3 py-1 text-xs font-semibold text-[#344054]">
              {socketStatus.state === 'connected'
                ? <Signal size={14} className="text-emerald-600" />
                : <SignalZero size={14} className="text-rose-600" />}
              Live {socketStatus.state}
            </span>
          )}
        />

        {needsAddress && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="font-bold text-amber-950">Home address needed</h3>
            <p className="mt-1 text-sm text-amber-900">
              Enrollment address is incomplete. Add it so the school can assign the right pickup stop and vehicle.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <Textarea
                  label="Street address"
                  required
                  value={addressForm.currentAddress}
                  onChange={(event) => setAddressForm((current) => ({ ...current, currentAddress: event.target.value }))}
                />
              </div>
              <Input
                label="City"
                required
                value={addressForm.city}
                onChange={(event) => setAddressForm((current) => ({ ...current, city: event.target.value }))}
              />
              <Input
                label="State"
                value={addressForm.state}
                onChange={(event) => setAddressForm((current) => ({ ...current, state: event.target.value }))}
              />
              <Input
                label="PIN code"
                value={addressForm.pinCode}
                onChange={(event) => setAddressForm((current) => ({ ...current, pinCode: event.target.value }))}
              />
              <Input
                label="Country"
                value={addressForm.country}
                onChange={(event) => setAddressForm((current) => ({ ...current, country: event.target.value }))}
              />
            </div>
            <Button className="mt-3" loading={savingAddress} onClick={handleSaveAddress}>
              Save home address
            </Button>
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading live location…" />
        ) : error ? (
          <div className="sb-card p-6 text-sm text-[#b42318]">
            {error}
            <p className="mt-2 text-[#667085]">
              If no assignment exists, ask the school to open <strong>Student Bus Assignments</strong> and link your child to a route/stop/vehicle.
            </p>
            {addressInfo?.addressComplete && (
              <p className="mt-2 text-sm text-[#344054]">
                Home address on file: {addressInfo.addressLabel}
              </p>
            )}
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
                {addressInfo?.addressLabel && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#667085]">Home address</p>
                    <p className="mt-1 font-semibold">{addressInfo.addressLabel}</p>
                  </div>
                )}
              </div>
              {mapVehicles.length ? (
                <div className="h-[min(50vh,360px)] w-full sm:h-[400px] lg:h-[440px]">
                  <LiveBusMap
                    vehicles={mapVehicles}
                    showSearch={false}
                    className="h-full w-full border border-[#d0d5dd]"
                  />
                </div>
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
