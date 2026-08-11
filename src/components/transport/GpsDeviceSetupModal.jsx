import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Power, RefreshCw } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import {
  disableGpsDevice,
  enableGpsDevice,
  listGpsDevices,
  registerGpsDevice,
  rotateGpsDeviceToken,
} from '../../services/transportTracking/trackingApi.js';
import { transportVehicleService } from '../../services/schoolModules/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import { API_BASE_URL } from '../../services/api/config.js';

const PROVIDERS = [
  { value: 'generic', label: 'Generic GPS device' },
  { value: 'teltonika', label: 'Teltonika' },
  { value: 'queclink', label: 'Queclink' },
  { value: 'driver_app', label: 'Driver mobile app' },
];

/**
 * Registers a GPS hardware / publisher device against a vehicle.
 * Plaintext token is shown only after create or rotate (prefer server-returned token).
 * Also lists devices with enable / disable / rotate actions.
 */
export default function GpsDeviceSetupModal({ open, onClose }) {
  const { toast } = useToast();
  const [tab, setTab] = useState('register');
  const [vehicles, setVehicles] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState('');
  const [copied, setCopied] = useState(false);
  const [revealedToken, setRevealedToken] = useState(null);
  const [form, setForm] = useState({
    vehicleId: '',
    imei: '',
    provider: 'generic',
  });

  const loadDevices = useCallback(async () => {
    setLoadingDevices(true);
    try {
      const items = await listGpsDevices();
      setDevices(Array.isArray(items) ? items : []);
    } catch (err) {
      setDevices([]);
      toast(err?.message || 'Unable to load GPS devices.', 'warning');
    } finally {
      setLoadingDevices(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setRevealedToken(null);
    setCopied(false);
    setTab('register');
    setForm({ vehicleId: '', imei: '', provider: 'generic' });
    setLoadingVehicles(true);
    transportVehicleService.list()
      .then((items) => {
        if (!cancelled) setVehicles(Array.isArray(items) ? items : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setVehicles([]);
          toast(err?.message || 'Unable to load vehicles.', 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingVehicles(false);
      });
    void loadDevices();
    return () => { cancelled = true; };
  }, [open, toast, loadDevices]);

  const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleCopyToken = async (token) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      toast('Device token copied.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Could not copy. Select the token and copy manually.', 'warning');
    }
  };

  const handleSubmit = async () => {
    if (!form.vehicleId) {
      toast('Select a vehicle.', 'warning');
      return;
    }
    if (!/^\d{15}$/.test(form.imei.trim())) {
      toast('IMEI must be exactly 15 digits.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        vehicleId: form.vehicleId,
        imei: form.imei.trim(),
        provider: form.provider,
      };
      const result = await registerGpsDevice(payload);
      const plaintext = result?.deviceToken || result?.device_token || result?.token;
      if (!plaintext) {
        toast(
          'Device registered, but the API did not return a plaintext token. Check backend register response.',
          'warning',
        );
      }
      const vehicleLabel = vehicles.find((v) => String(v.id) === String(form.vehicleId));
      setRevealedToken({
        source: 'create',
        deviceToken: plaintext || '',
        imei: form.imei.trim(),
        vehicleNumber: vehicleLabel?.vehicleNumber || vehicleLabel?.vehicle_number || form.vehicleId,
        deviceId: result?.id || result?.deviceId || null,
      });
      toast('GPS device registered. Save the device token now — it is shown only once.', 'success');
      await loadDevices();
    } catch (err) {
      toast(err?.message || 'Unable to register GPS device.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRotate = async (device) => {
    setActionId(device.id);
    try {
      const result = await rotateGpsDeviceToken(device.id);
      const plaintext = result?.deviceToken || result?.device_token || result?.token;
      if (!plaintext) {
        toast('Token rotated, but plaintext was not returned by the API.', 'warning');
        return;
      }
      setRevealedToken({
        source: 'rotate',
        deviceToken: plaintext,
        imei: device.imei,
        vehicleNumber: device.vehicleNumber || device.vehicleId,
        deviceId: device.id,
      });
      setTab('register');
      toast('New token generated. Save it now — it will not be shown again.', 'success');
      await loadDevices();
    } catch (err) {
      toast(err?.message || 'Unable to rotate token.', 'error');
    } finally {
      setActionId('');
    }
  };

  const handleToggleStatus = async (device) => {
    const nextStatus = String(device.status || '').toLowerCase() === 'active' ? 'disabled' : 'active';
    setActionId(device.id);
    try {
      if (nextStatus === 'active') await enableGpsDevice(device.id);
      else await disableGpsDevice(device.id);
      toast(nextStatus === 'active' ? 'Device enabled.' : 'Device disabled.', 'success');
      await loadDevices();
    } catch (err) {
      toast(err?.message || 'Unable to update device status.', 'error');
    } finally {
      setActionId('');
    }
  };

  const handleClose = () => {
    setForm({ vehicleId: '', imei: '', provider: 'generic' });
    setRevealedToken(null);
    setCopied(false);
    onClose?.();
  };

  const exampleCurl = revealedToken?.deviceToken
    ? `curl -X POST "${API_BASE_URL}/tracking/location" \\
  -H "Content-Type: application/json" \\
  -H "X-Device-Token: ${revealedToken.deviceToken}" \\
  -d '{
    "imei": "${revealedToken.imei}",
    "latitude": 23.2599,
    "longitude": 77.4126,
    "speed": 28,
    "direction": 90,
    "accuracy": 8,
    "timestamp": "${new Date().toISOString()}",
    "battery": 80
  }'`
    : '';

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="GPS device setup"
      size="lg"
      footer={revealedToken ? (
        <Button onClick={() => { setRevealedToken(null); setCopied(false); }}>Done</Button>
      ) : tab === 'register' ? (
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button loading={saving} onClick={handleSubmit}>Register device</Button>
        </>
      ) : (
        <Button onClick={handleClose}>Close</Button>
      )}
    >
      <div className="mb-4 flex gap-2">
        <Button
          variant={tab === 'register' ? 'primary' : 'secondary'}
          onClick={() => setTab('register')}
        >
          Register
        </Button>
        <Button
          variant={tab === 'manage' ? 'primary' : 'secondary'}
          onClick={() => { setTab('manage'); void loadDevices(); }}
        >
          Manage devices
        </Button>
      </div>

      {revealedToken ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-bold text-emerald-950">
              {revealedToken.source === 'rotate' ? 'Token rotated' : 'Device registered'}
            </p>
            <p className="mt-1 text-sm text-emerald-900">
              Vehicle <strong>{revealedToken.vehicleNumber}</strong>
              {revealedToken.imei ? <> · IMEI <strong>{revealedToken.imei}</strong></> : null}
            </p>
            <p className="mt-2 text-xs text-emerald-800">
              Save this device token now. The backend stores only a hash — you cannot view it again.
              Use it as header <code>X-Device-Token</code> on the tracker.
            </p>
            {revealedToken.deviceToken ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="flex-1 break-all rounded-lg bg-white px-3 py-2 text-xs text-[#0b1c30]">
                  {revealedToken.deviceToken}
                </code>
                <Button variant="secondary" onClick={() => void handleCopyToken(revealedToken.deviceToken)}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy token'}
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-amber-800">
                No plaintext token in the API response. Ask backend to return `deviceToken` once on create/rotate.
              </p>
            )}
          </div>

          {exampleCurl ? (
            <div className="rounded-xl border border-[#e8ebf2] bg-[#f8fafc] p-4 text-sm text-[#344054]">
              <p className="font-semibold text-[#0b1c30]">Next: send live GPS points</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                <li>Configure the hardware tracker (or test script) with this IMEI + token.</li>
                <li>POST locations to <code className="text-xs">/api/v1/tracking/location</code> with header <code className="text-xs">X-Device-Token</code>.</li>
                <li>Open <strong>Live Bus Tracking</strong> — wait for the first fix, then the bus marker moves.</li>
              </ol>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-[#0b1c30] p-3 text-[11px] leading-5 text-white">
                {exampleCurl}
              </pre>
            </div>
          ) : null}
        </div>
      ) : tab === 'manage' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-[#667085]">Enable, disable, or rotate tokens for registered devices.</p>
            <Button variant="secondary" onClick={() => void loadDevices()}>
              <RefreshCw size={14} /> Refresh
            </Button>
          </div>
          {loadingDevices ? (
            <p className="text-sm text-[#667085]">Loading devices…</p>
          ) : !devices.length ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              No GPS devices yet. Register one on the Register tab.
            </p>
          ) : (
            <ul className="divide-y divide-[#eaecf0] rounded-xl border border-[#eaecf0]">
              {devices.map((device) => {
                const active = String(device.status || '').toLowerCase() === 'active';
                const busy = actionId === device.id;
                return (
                  <li key={device.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="font-semibold text-[#0b1c30]">
                        {device.vehicleNumber || device.vehicleId || 'Vehicle'}
                      </p>
                      <p className="text-xs text-[#667085]">
                        IMEI {device.imei || '—'} · {device.provider || 'generic'} · {device.status || 'unknown'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void handleToggleStatus(device)}
                      >
                        <Power size={14} />
                        {active ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void handleRotate(device)}
                      >
                        <KeyRound size={14} />
                        Rotate token
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#dbe4f5] bg-[#eef5ff] p-4 text-sm text-[#344054]">
            <p className="font-semibold text-[#0b1c30]">How to create a GPS device</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Create the <strong>vehicle</strong> first (Transport → Vehicles) if the list is empty.</li>
              <li>Select that vehicle below.</li>
              <li>Enter the tracker <strong>IMEI</strong> (15 digits from the device label).</li>
              <li>Click <strong>Register device</strong> — the backend returns a one-time token.</li>
              <li>Copy the token into the GPS device as <code className="text-xs">X-Device-Token</code>.</li>
            </ol>
          </div>

          {!vehicles.length && !loadingVehicles ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              No vehicles found. Create a vehicle first, then reopen this dialog.
            </p>
          ) : null}

          <Select
            label="Vehicle"
            required
            value={form.vehicleId}
            placeholder={loadingVehicles ? 'Loading vehicles…' : 'Select vehicle'}
            disabled={loadingVehicles}
            options={vehicles.map((vehicle) => ({
              value: String(vehicle.id),
              label: vehicle.vehicleNumber || vehicle.vehicle_number || vehicle.id,
            }))}
            onChange={(event) => patch('vehicleId', event.target.value)}
          />
          <Input
            label="IMEI"
            required
            value={form.imei}
            placeholder="15-digit device IMEI (e.g. 353342622051695)"
            onChange={(event) => patch('imei', event.target.value.replace(/\D/g, '').slice(0, 15))}
          />

          <Select
            label="Provider"
            value={form.provider}
            options={PROVIDERS}
            onChange={(event) => patch('provider', event.target.value)}
          />
        </div>
      )}
    </Modal>
  );
}
