import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import { registerGpsDevice } from '../../services/transportTracking/trackingApi.js';
import { transportVehicleService } from '../../services/schoolModules/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import { API_BASE_URL } from '../../services/api/config.js';

const PROVIDERS = [
  { value: 'generic', label: 'Generic GPS device' },
  { value: 'teltonika', label: 'Teltonika' },
  { value: 'queclink', label: 'Queclink' },
  { value: 'driver_app', label: 'Driver mobile app' },
];

function generateDeviceToken() {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Registers a GPS hardware / publisher device against a vehicle.
 * Device token is auto-generated (hidden on the form) and shown once after save.
 */
export default function GpsDeviceSetupModal({ open, onClose }) {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [registered, setRegistered] = useState(null);
  const [form, setForm] = useState({
    vehicleId: '',
    imei: '',
    deviceToken: '',
    provider: 'generic',
  });

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setRegistered(null);
    setCopied(false);
    setForm({
      vehicleId: '',
      imei: '',
      deviceToken: generateDeviceToken(),
      provider: 'generic',
    });
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
    return () => { cancelled = true; };
  }, [open, toast]);

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

    const deviceToken = (form.deviceToken.trim().length >= 8
      ? form.deviceToken.trim()
      : generateDeviceToken());

    setSaving(true);
    try {
      const payload = {
        vehicleId: form.vehicleId,
        imei: form.imei.trim(),
        deviceToken,
        provider: form.provider,
      };
      const result = await registerGpsDevice(payload);
      const vehicleLabel = vehicles.find((v) => String(v.id) === String(form.vehicleId));
      setRegistered({
        ...payload,
        vehicleNumber: vehicleLabel?.vehicleNumber || vehicleLabel?.vehicle_number || form.vehicleId,
        deviceId: result?.id || result?.deviceId || null,
      });
      setForm((current) => ({ ...current, deviceToken }));
      toast('GPS device registered. Save the device token now — it is shown only once.', 'success');
    } catch (err) {
      toast(err?.message || 'Unable to register GPS device.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm({ vehicleId: '', imei: '', deviceToken: '', provider: 'generic' });
    setRegistered(null);
    setCopied(false);
    onClose?.();
  };

  const exampleCurl = registered
    ? `curl -X POST "${API_BASE_URL}/tracking/location" \\
  -H "Content-Type: application/json" \\
  -H "X-Device-Token: ${registered.deviceToken}" \\
  -d '{
    "imei": "${registered.imei}",
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
      footer={registered ? (
        <Button onClick={handleClose}>Done</Button>
      ) : (
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button loading={saving} onClick={handleSubmit}>Register device</Button>
        </>
      )}
    >
      {registered ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-bold text-emerald-950">Device registered</p>
            <p className="mt-1 text-sm text-emerald-900">
              Vehicle <strong>{registered.vehicleNumber}</strong> · IMEI <strong>{registered.imei}</strong>
            </p>
            <p className="mt-2 text-xs text-emerald-800">
              Save this device token now. The backend stores only a hash — you cannot view it again.
              Use it as header <code>X-Device-Token</code> on the tracker.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="flex-1 break-all rounded-lg bg-white px-3 py-2 text-xs text-[#0b1c30]">
                {registered.deviceToken}
              </code>
              <Button variant="secondary" onClick={() => void handleCopyToken(registered.deviceToken)}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy token'}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-[#e8ebf2] bg-[#f8fafc] p-4 text-sm text-[#344054]">
            <p className="font-semibold text-[#0b1c30]">Next: send live GPS points</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
              <li>Configure the hardware tracker (or test script) with this IMEI + token.</li>
              <li>POST locations to <code className="text-xs">/api/v1/tracking/location</code> with header <code className="text-xs">X-Device-Token</code>.</li>
              <li>Open <strong>Live Bus Tracking</strong> — wait for the first fix, then the bus marker moves.</li>
              <li>Parent app <strong>Transport</strong> shows the same vehicle after assignment.</li>
            </ol>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-[#0b1c30] p-3 text-[11px] leading-5 text-white">
              {exampleCurl}
            </pre>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#dbe4f5] bg-[#eef5ff] p-4 text-sm text-[#344054]">
            <p className="font-semibold text-[#0b1c30]">How to create a GPS device</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Create the <strong>vehicle</strong> first (Transport → Vehicles) if the list is empty.</li>
              <li>Select that vehicle below.</li>
              <li>Enter the tracker <strong>IMEI</strong> (15 digits from the device label).</li>
              <li>Click <strong>Register device</strong> — a secure token is created automatically.</li>
              <li>Copy the token from the success screen into the GPS device as <code className="text-xs">X-Device-Token</code>.</li>
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
