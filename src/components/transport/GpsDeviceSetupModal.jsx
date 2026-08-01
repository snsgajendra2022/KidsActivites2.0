import { useEffect, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import { registerGpsDevice } from '../../services/transportTracking/trackingApi.js';
import { transportVehicleService } from '../../services/schoolModules/index.js';
import { useToast } from '../../context/ToastContext.jsx';

const PROVIDERS = [
  { value: 'generic', label: 'Generic GPS device' },
  { value: 'teltonika', label: 'Teltonika' },
  { value: 'queclink', label: 'Queclink' },
  { value: 'driver_app', label: 'Driver mobile app' },
];

/**
 * Registers a GPS hardware / publisher device against a vehicle.
 */
export default function GpsDeviceSetupModal({ open, onClose }) {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vehicleId: '',
    imei: '',
    deviceToken: '',
    provider: 'generic',
  });

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
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

  const handleSubmit = async () => {
    if (!form.vehicleId) {
      toast('Select a vehicle.', 'warning');
      return;
    }
    if (!form.imei.trim()) {
      toast('IMEI is required.', 'warning');
      return;
    }
    if (!form.deviceToken.trim() || form.deviceToken.trim().length < 8) {
      toast('Device token must be at least 8 characters.', 'warning');
      return;
    }

    setSaving(true);
    try {
      await registerGpsDevice({
        vehicleId: form.vehicleId,
        imei: form.imei.trim(),
        deviceToken: form.deviceToken.trim(),
        provider: form.provider,
      });
      toast('GPS device registered. Store the token securely — it is not shown again.', 'success');
      setForm({ vehicleId: '', imei: '', deviceToken: '', provider: 'generic' });
      onClose?.();
    } catch (err) {
      toast(err?.message || 'Unable to register GPS device.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="GPS device setup"
      size="lg"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={handleSubmit}>Register device</Button>
        </>
      )}
    >
      <div className="space-y-4">
        <p className="text-sm text-[#667085]">
          Provision a hardware tracker or driver-app publisher for a vehicle.
          The backend stores a hash of the device token — copy it before saving.
        </p>
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
          placeholder="15-digit device IMEI"
          onChange={(event) => patch('imei', event.target.value)}
        />
        <Input
          label="Device token"
          required
          type="password"
          value={form.deviceToken}
          placeholder="One-time secret sent as X-Device-Token"
          onChange={(event) => patch('deviceToken', event.target.value)}
        />
        <Select
          label="Provider"
          value={form.provider}
          options={PROVIDERS}
          onChange={(event) => patch('provider', event.target.value)}
        />
      </div>
    </Modal>
  );
}
