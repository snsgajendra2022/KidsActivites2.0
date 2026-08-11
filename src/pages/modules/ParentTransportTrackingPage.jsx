import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bus, Clock, MapPin, Signal, SignalZero } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { LoadingState, PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import LiveBusMap from '../../components/transport/LiveBusMap.jsx';
import { fetchParentTransportLive } from '../../services/transportTracking/trackingApi.js';
import { createTrackingSocket } from '../../services/transportTracking/trackingSocket.js';
import {
  fetchParentTransportAddress,
  updateParentChildTransportAddress,
} from '../../services/transportAddressService.js';
import { getParentChildren } from '../../services/parentService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  isTransportAddressComplete,
  normalizeTransportAddress,
} from '../../utils/transportAddress.js';
import {
  resolveParentTrackingState,
  trackingStateHint,
  trackingStateLabel,
  TRACKING_UI_STATES,
} from '../../utils/transportTrackingState.js';
import { stopsToMapFeatures } from '../../utils/transportRouteGeo.js';
import { isNewerLocation } from '../../utils/transportLocationSequence.js';
import useRoadRoute from '../../hooks/useRoadRoute.js';
import { WS_EVENT_TYPES } from '../../types/transportModels.js';

function childStudentId(child) {
  return child?.studentId || child?.enrolledStudentId || child?.id || child?.applicationId || '';
}

function childLabel(child) {
  return child?.studentName
    || child?.fullName
    || child?.name
    || child?.student?.fullName
    || child?.applicationNo
    || 'Child';
}

export default function ParentTransportTrackingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [children, setChildren] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
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

  useEffect(() => {
    let cancelled = false;
    getParentChildren(user)
      .then((list) => {
        if (cancelled) return;
        const items = Array.isArray(list) ? list : [];
        setChildren(items);
        const firstId = childStudentId(items[0]);
        setSelectedStudentId((current) => current || firstId || '');
      })
      .catch(() => {
        if (!cancelled) setChildren([]);
      });
    return () => { cancelled = true; };
  }, [user]);

  const loadLive = useCallback(async (studentId, { silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const params = studentId ? { studentId } : {};
      const result = await fetchParentTransportLive(params);
      setData(result);
      if (!silent) setError('');
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        setData(null);
        setError('You are not authorized to view live tracking. Sign in again or contact the school.');
      } else if (!silent) {
        setData(null);
        setError(err?.message || 'Unable to load live tracking.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadAddress = useCallback(async (studentId) => {
    try {
      const info = await fetchParentTransportAddress(user, studentId || null);
      setAddressInfo(info);
      if (info?.address) setAddressForm(normalizeTransportAddress(info.address));
      else {
        setAddressForm({
          currentAddress: '',
          city: '',
          state: '',
          pinCode: '',
          country: 'India',
        });
      }
    } catch {
      setAddressInfo(null);
    }
  }, [user]);

  useEffect(() => {
    void loadLive(selectedStudentId);
    void loadAddress(selectedStudentId);
  }, [selectedStudentId, loadLive, loadAddress]);

  useEffect(() => {
    if (!data?.vehicleId) return undefined;
    const socket = createTrackingSocket({
      vehicleId: data.vehicleId,
      onStatus: (status) => {
        setSocketStatus(status);
        if (status?.state === 'connected' && status?.reconnect) {
          void loadLive(selectedStudentId, { silent: true });
        }
      },
      onEvent: (event) => {
        if (!event?.data) return;
        const eventVehicleId = String(event.data.vehicleId || event.data.vehicle_id || '');
        if (eventVehicleId && eventVehicleId !== String(data.vehicleId)) return;

        if (event.type === WS_EVENT_TYPES.TRIP_COMPLETED) {
          setData((current) => (current ? {
            ...current,
            tripStatus: 'completed',
            status: 'completed',
            stateCode: 'COMPLETED',
          } : current));
          return;
        }

        if (event.type === WS_EVENT_TYPES.TRACKING_WARNING || event.type === WS_EVENT_TYPES.TRACKING_OFFLINE) {
          setData((current) => (current ? {
            ...current,
            status: event.type === WS_EVENT_TYPES.TRACKING_OFFLINE ? 'offline' : 'warning',
            lat: event.data.latitude ?? current.lat,
            lng: event.data.longitude ?? current.lng,
            updatedAt: event.data.updatedAt || event.data.updated_at || current.updatedAt,
            sequence: event.data.sequence ?? current.sequence,
          } : current));
          return;
        }

        if (event.type !== WS_EVENT_TYPES.LOCATION_UPDATED) return;
        setData((current) => {
          if (!current) return current;
          const incoming = {
            sequence: event.data.sequence,
            updatedAt: event.data.updatedAt || event.data.updated_at || new Date().toISOString(),
            recordedAt: event.data.recordedAt || event.data.recorded_at,
          };
          if (!isNewerLocation(current, incoming)) return current;
          return {
            ...current,
            lat: event.data.latitude ?? event.data.lat,
            lng: event.data.longitude ?? event.data.lng,
            speedKmh: event.data.speedKmh ?? event.data.speed_kmh,
            heading: event.data.heading,
            status: event.data.trackingStatus || event.data.tracking_status || current.status,
            etaMinutes: event.data.eta?.etaMinutes ?? current.etaMinutes,
            nextStop: event.data.eta?.nextStopName || current.nextStop,
            lastStop: event.data.eta?.lastStopName || current.lastStop,
            sequence: incoming.sequence ?? current.sequence,
            updatedAt: incoming.updatedAt,
          };
        });
      },
    });
    return () => socket.close();
  }, [data?.vehicleId, loadLive, selectedStudentId]);

  const trackingState = useMemo(() => resolveParentTrackingState(data), [data]);

  const mapStops = useMemo(() => stopsToMapFeatures(data?.stops), [data?.stops]);
  const roadRoute = useRoadRoute(data?.stops, { enabled: Boolean(mapStops.length) });

  const mapVehicles = Number.isFinite(Number(data?.lat)) && Number.isFinite(Number(data?.lng))
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

  const childOptions = useMemo(() => (
    children
      .map((child) => {
        const id = childStudentId(child);
        if (!id) return null;
        return { value: String(id), label: childLabel(child) };
      })
      .filter(Boolean)
  ), [children]);

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

  const showMapShell = [
    TRACKING_UI_STATES.WAITING_FOR_GPS,
    TRACKING_UI_STATES.LIVE,
    TRACKING_UI_STATES.WARNING,
    TRACKING_UI_STATES.OFFLINE,
    TRACKING_UI_STATES.ASSIGNED_NO_ACTIVE_TRIP,
  ].includes(trackingState);

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

        {childOptions.length > 1 ? (
          <div className="mb-4 max-w-sm">
            <Select
              label="Child"
              value={selectedStudentId}
              options={childOptions}
              onChange={(event) => setSelectedStudentId(event.target.value)}
            />
          </div>
        ) : null}

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
          </div>
        ) : trackingState === TRACKING_UI_STATES.NO_ASSIGNMENT ? (
          <div className="sb-card p-6 text-sm text-[#344054]">
            <p className="font-bold text-[#0b1c30]">{trackingStateLabel(trackingState)}</p>
            <p className="mt-2 text-[#667085]">{trackingStateHint(trackingState)}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="sb-card p-5 md:col-span-2">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[#0058be]">
                  <Bus size={18} />
                  <h2 className="text-lg font-bold text-[#0b1c30]">{data?.routeName || 'Assigned route'}</h2>
                </div>
                <span className="rounded-full border border-[#c5c6cd] bg-white px-3 py-1 text-xs font-semibold text-[#344054]">
                  {trackingStateLabel(trackingState)}
                </span>
              </div>
              <p className="mb-4 text-sm text-[#667085]">{trackingStateHint(trackingState)}</p>
              <div className="mb-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#667085]">Vehicle</p>
                  <p className="mt-1 font-semibold">{data?.vehicleNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#667085]">Assigned stop</p>
                  <p className="mt-1 font-semibold">{data?.assignedStop || data?.nextStop || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#667085]">Last stop</p>
                  <p className="mt-1 font-semibold">{data?.lastStop || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#667085]">Next stop</p>
                  <p className="mt-1 font-semibold">{data?.nextStop || '—'}</p>
                </div>
              </div>
              {showMapShell ? (
                <div className="h-[min(50vh,360px)] w-full sm:h-[400px] lg:h-[440px]">
                  <LiveBusMap
                    vehicles={mapVehicles}
                    stopFeatures={mapStops}
                    routeGeoJson={roadRoute.geoJson || data?.geometry || null}
                    showSearch={false}
                    className="h-full w-full border border-[#d0d5dd]"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#c5d0e0] bg-[#f7f9fc] p-8 text-center text-sm text-[#667085]">
                  <MapPin className="mx-auto mb-2 text-[#0058be]" />
                  {trackingStateHint(trackingState)}
                </div>
              )}
            </div>
            <div className="sb-card p-5">
              <div className="flex items-center gap-2 text-[#0058be]">
                <Clock size={18} />
                <h3 className="font-bold text-[#0b1c30]">ETA</h3>
              </div>
              <p className="mt-4 text-3xl font-black text-[#0b1c30]">
                {data?.etaMinutes != null ? `${data.etaMinutes} min` : '—'}
              </p>
              <p className="mt-2 text-sm capitalize text-[#667085]">
                Status: {String(data?.status || trackingState).replace(/_/g, ' ')}
              </p>
              <p className="mt-4 text-xs text-[#8a93a3]">
                {data?.updatedAt
                  ? `Updated ${new Date(data.updatedAt).toLocaleTimeString()}`
                  : 'No GPS update yet'}
              </p>
              <Button className="mt-4" variant="secondary" onClick={() => void loadLive(selectedStudentId)}>
                Refresh
              </Button>
            </div>
          </div>
        )}
      </PageTransition>
    </AppLayout>
  );
}
