import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bus, Plus, Trash2, UserCheck, UserRound } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { EmptyState, LoadingState, PageHeader, SearchField } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Modal, { ConfirmModal } from '../../components/ui/Modal.jsx';
import { ResponsiveDataTable, TableActionButton } from '../../components/ui/DataTable.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { transportVehicleService } from '../../services/schoolModules/index.js';
import {
  activateDriver,
  assignDriverToVehicle,
  createDriver,
  deactivateDriver,
  listDrivers,
  updateDriver,
} from '../../services/driverService.js';
import '../../styles/admin-modules.css';

const EMPTY_FORM = {
  name: '',
  email: '',
  mobile: '',
  licenseNumber: '',
  vehicleId: '',
  status: 'active',
};

const MOBILE_PATTERN = /^[6-9]\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isDriverInactive(driver) {
  if (!driver) return false;
  if (driver.active === false || driver.active === 0) return true;
  const label = String(driver.statusLabel || driver.status || '').trim().toLowerCase();
  return label === 'inactive' || label === 'disabled' || label === 'deactivated';
}

export default function TransportDriversPage() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [statusAction, setStatusAction] = useState(null); // { id, activate: boolean, name }
  const [tempPassword, setTempPassword] = useState(null);
  const [endpointHint, setEndpointHint] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setEndpointHint('');
    try {
      const [drivers, vehicleList] = await Promise.all([
        listDrivers().catch((err) => {
          toast(err?.message || 'Unable to load drivers. Backend drivers API may not be deployed yet.', 'error');
          setEndpointHint(err?.status === 404
            ? 'Drivers API not found yet (/admin/transport/drivers). Spring team must deploy the contract.'
            : '');
          return [];
        }),
        transportVehicleService.list().catch(() => []),
      ]);
      setItems(Array.isArray(drivers) ? drivers : []);
      setVehicles(Array.isArray(vehicleList) ? vehicleList : []);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const vehicleOptions = useMemo(() => (
    (vehicles || [])
      .map((vehicle) => {
        const id = vehicle.id || vehicle.vehicleId;
        if (!id) return null;
        const number = vehicle.vehicleNumber || vehicle.vehicle_number || id;
        const assigned = vehicle.driverUserId || vehicle.driver_user_id;
        return {
          value: String(id),
          label: assigned ? `${number} (has driver)` : String(number),
        };
      })
      .filter(Boolean)
  ), [vehicles]);

  const vehicleMap = useMemo(() => {
    const map = new Map();
    vehicles.forEach((vehicle) => {
      const id = vehicle.id || vehicle.vehicleId;
      if (id) map.set(String(id), vehicle);
    });
    return map;
  }, [vehicles]);

  const enriched = useMemo(() => items.map((driver) => {
    const vehicle = driver.vehicleId
      ? vehicleMap.get(String(driver.vehicleId))
      : [...vehicleMap.values()].find(
        (item) => String(item.driverUserId || item.driver_user_id || '') === String(driver.userId || driver.id),
      );
    return {
      ...driver,
      vehicleId: driver.vehicleId || vehicle?.id || null,
      vehicleNumber: driver.vehicleNumber
        || vehicle?.vehicleNumber
        || vehicle?.vehicle_number
        || '—',
      statusLabel: isDriverInactive(driver) ? 'Inactive' : 'Active',
    };
  }), [items, vehicleMap]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return enriched;
    return enriched.filter((item) => [
      item.name,
      item.email,
      item.mobile,
      item.licenseNumber,
      item.vehicleNumber,
      item.statusLabel,
    ].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [enriched, search]);

  const columns = useMemo(() => [
    { key: 'name', label: 'Driver', primary: true },
    { key: 'email', label: 'Email' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'licenseNumber', label: 'License' },
    { key: 'vehicleNumber', label: 'Assigned vehicle' },
    { key: 'statusLabel', label: 'Status', badge: true },
  ], []);

  const openCreate = () => {
    setEditing(null);
    setTempPassword(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setTempPassword(null);
    setForm({
      name: item.name || '',
      email: item.email || '',
      mobile: item.mobile || '',
      licenseNumber: item.licenseNumber || '',
      vehicleId: item.vehicleId || '',
      status: isDriverInactive(item) ? 'inactive' : 'active',
    });
    setModalOpen(true);
  };

  const patchForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast('Name and email are required.', 'warning');
      return;
    }
    if (!EMAIL_PATTERN.test(form.email.trim())) {
      toast('Enter a valid email address.', 'warning');
      return;
    }
    const mobile = form.mobile.trim();
    if (mobile && !MOBILE_PATTERN.test(mobile)) {
      toast('Mobile must be a valid 10-digit Indian number.', 'warning');
      return;
    }

    setSaving(true);
    try {
      let driverId = editing?.id;
      if (editing) {
        await updateDriver(editing.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          mobile: mobile || undefined,
          licenseNumber: form.licenseNumber.trim() || undefined,
          status: form.status,
        });
        toast('Driver updated.', 'success');
      } else {
        const result = await createDriver({
          name: form.name.trim(),
          email: form.email.trim(),
          mobile: mobile || undefined,
          licenseNumber: form.licenseNumber.trim() || undefined,
          status: form.status,
        });
        driverId = result.driver?.id || result.driver?.userId;
        setTempPassword(result.tempPassword || null);
        toast('Driver account created.', 'success');
      }

      if (form.vehicleId && driverId) {
        await assignDriverToVehicle({
          driverUserId: driverId,
          vehicleId: form.vehicleId,
        });
      }

      if (!tempPassword && !editing) {
        setModalOpen(false);
      } else if (editing) {
        setModalOpen(false);
      }
      await load();
    } catch (err) {
      toast(err?.message || 'Unable to save driver.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusConfirm = async () => {
    if (!statusAction?.id) return;
    setSaving(true);
    try {
      if (statusAction.activate) {
        await activateDriver(statusAction.id);
        setItems((current) => current.map((driver) => (
          String(driver.id) === String(statusAction.id)
            ? { ...driver, active: true, status: 'active' }
            : driver
        )));
        toast('Driver activated.', 'success');
      } else {
        await deactivateDriver(statusAction.id);
        setItems((current) => current.map((driver) => (
          String(driver.id) === String(statusAction.id)
            ? { ...driver, active: false, status: 'inactive' }
            : driver
        )));
        toast('Driver deactivated.', 'success');
      }
      setStatusAction(null);
      await load();
    } catch (err) {
      toast(err?.message || (statusAction.activate
        ? 'Unable to activate driver.'
        : 'Unable to deactivate driver.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="Transport Drivers"
          subtitle="Create driver login accounts and assign each driver to one vehicle. Drivers use the mobile app to start trips and share GPS."
          actions={<Button onClick={openCreate}><Plus size={16} /> Add driver</Button>}
        />

        {endpointHint ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {endpointHint}
          </div>
        ) : null}

        <div className="admin-record-toolbar">
          <SearchField
            className="min-w-[200px] flex-1"
            maxWidthClass=""
            placeholder="Search name, email, mobile, vehicle…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <LoadingState message="Loading drivers…" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title="No drivers yet"
            description="Create a driver account, then assign them to a vehicle so the mobile trip screen can auto-share GPS."
            action={<Button onClick={openCreate}>Add driver</Button>}
          />
        ) : (
          <ResponsiveDataTable
            layout="cards"
            columns={columns}
            data={filtered}
            emptyMessage="No drivers match your search."
            minWidth={960}
            renderActions={(item) => {
              // Match the Status badge: Inactive → Activate, Active → Deactivate
              const inactive = item.statusLabel === 'Inactive' || isDriverInactive(item);
              return (
                <>
                  <TableActionButton variant="outline" onClick={() => openEdit(item)}>
                    Edit
                  </TableActionButton>
                  {inactive ? (
                    <TableActionButton
                      variant="success"
                      onClick={() => setStatusAction({
                        id: item.id,
                        activate: true,
                        name: item.name || 'this driver',
                      })}
                    >
                      <UserCheck size={14} /> Activate
                    </TableActionButton>
                  ) : (
                    <TableActionButton
                      variant="danger"
                      onClick={() => setStatusAction({
                        id: item.id,
                        activate: false,
                        name: item.name || 'this driver',
                      })}
                    >
                      <Trash2 size={14} /> Deactivate
                    </TableActionButton>
                  )}
                </>
              );
            }}
          />
        )}

        <Modal
          open={modalOpen}
          onClose={() => {
            if (tempPassword) {
              setTempPassword(null);
              setModalOpen(false);
              return;
            }
            setModalOpen(false);
          }}
          title={editing ? 'Edit driver' : 'Add driver'}
          size="lg"
          footer={tempPassword ? (
            <Button onClick={() => { setTempPassword(null); setModalOpen(false); }}>Done</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button loading={saving} onClick={() => void handleSave()}>
                {editing ? 'Save changes' : 'Create driver'}
              </Button>
            </>
          )}
        >
          {tempPassword ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
              <p className="font-bold">Driver account created</p>
              <p className="mt-1">Share this temporary password once. The driver signs in on the mobile app with role <code>driver</code>.</p>
              <code className="mt-3 block break-all rounded-lg bg-white px-3 py-2 text-sm">{tempPassword}</code>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Full name"
                required
                value={form.name}
                onChange={(event) => patchForm('name', event.target.value)}
              />
              <Input
                label="Email"
                required
                type="email"
                value={form.email}
                onChange={(event) => patchForm('email', event.target.value)}
              />
              <Input
                label="Mobile"
                value={form.mobile}
                onChange={(event) => patchForm('mobile', event.target.value.replace(/\D/g, '').slice(0, 10))}
              />
              <Input
                label="License number"
                value={form.licenseNumber}
                onChange={(event) => patchForm('licenseNumber', event.target.value)}
              />
              <Select
                label="Assign vehicle"
                value={form.vehicleId}
                placeholder="Select vehicle (optional)"
                options={vehicleOptions}
                onChange={(event) => patchForm('vehicleId', event.target.value)}
              />
              <p className="md:col-span-2 -mt-1 text-xs text-[#667085]">
                Sets vehicle.driverUserId. One active driver per vehicle.
              </p>
              <Select
                label="Status"
                value={form.status}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                onChange={(event) => patchForm('status', event.target.value)}
              />
              <div className="md:col-span-2 rounded-xl border border-[#dbe4f5] bg-[#eef5ff] p-3 text-sm text-[#344054]">
                <p className="font-semibold text-[#0b1c30] flex items-center gap-2">
                  <Bus size={16} /> Relationship
                </p>
                <p className="mt-1">
                  Driver user (<code>driverUserId</code>) → Vehicle → Route/Stops → Trip → Student assignment → Parent live map.
                </p>
              </div>
            </div>
          )}
        </Modal>

        <ConfirmModal
          open={Boolean(statusAction)}
          onClose={() => setStatusAction(null)}
          onConfirm={() => void handleStatusConfirm()}
          title={statusAction?.activate ? 'Activate driver?' : 'Deactivate driver?'}
          message={statusAction?.activate
            ? `${statusAction?.name || 'This driver'} will be able to sign in and publish GPS again.`
            : `${statusAction?.name || 'This driver'} will no longer sign in or publish GPS. Reassign the vehicle before the next trip.`}
          confirmText={statusAction?.activate ? 'Activate' : 'Deactivate'}
          confirmVariant={statusAction?.activate ? 'primary' : 'danger'}
          loading={saving}
        />
      </PageTransition>
    </DashboardLayout>
  );
}
