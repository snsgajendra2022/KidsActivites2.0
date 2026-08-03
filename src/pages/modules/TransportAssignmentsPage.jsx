import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bus, MapPin, Plus, Search, Trash2, UserRound } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { EmptyState, LoadingState, PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Modal, { ConfirmModal } from '../../components/ui/Modal.jsx';
import { ResponsiveDataTable, TableActionButton } from '../../components/ui/DataTable.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useClassStudentOptions } from '../../hooks/useClassStudentOptions.js';
import {
  transportAssignmentService,
  transportRouteService,
  transportVehicleService,
} from '../../services/schoolModules/index.js';
import {
  fetchStudentTransportContext,
  updateStudentTransportAddress,
} from '../../services/transportAddressService.js';
import {
  formatTransportAddress,
  isTransportAddressComplete,
  normalizeTransportAddress,
  suggestNearestStop,
} from '../../utils/transportAddress.js';
import { normalizeRouteStops } from '../../utils/transportRouteGeo.js';

const EMPTY_FORM = {
  classId: '',
  studentId: '',
  routeId: '',
  stopId: '',
  vehicleId: '',
  status: 'active',
};

const EMPTY_ADDRESS = {
  currentAddress: '',
  city: '',
  state: '',
  pinCode: '',
  country: 'India',
};

export default function TransportAssignmentsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [studentMeta, setStudentMeta] = useState(null);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const {
    classOptions,
    studentOptions,
    classesLoading,
    studentsLoading,
    classesError,
    studentsError,
  } = useClassStudentOptions(user, form.classId, { loadStudents: modalOpen });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [assignments, routeList, vehicleList] = await Promise.all([
        transportAssignmentService.list(),
        transportRouteService.list().catch(() => []),
        transportVehicleService.list().catch(() => []),
      ]);
      setItems(Array.isArray(assignments) ? assignments : []);
      setRoutes(Array.isArray(routeList) ? routeList : []);
      setVehicles(Array.isArray(vehicleList) ? vehicleList : []);
    } catch (err) {
      toast(err?.message || 'Unable to load transport assignments.', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!modalOpen || !form.studentId) {
      if (!form.studentId) {
        setStudentMeta(null);
        setAddress(EMPTY_ADDRESS);
      }
      return undefined;
    }
    let cancelled = false;
    fetchStudentTransportContext(form.studentId)
      .then((ctx) => {
        if (cancelled) return;
        setStudentMeta(ctx);
        setAddress(normalizeTransportAddress(ctx.address));
      })
      .catch((err) => {
        if (cancelled) return;
        setStudentMeta(null);
        setAddress(EMPTY_ADDRESS);
        toast(err?.message || 'Unable to load student address.', 'warning');
      });
    return () => { cancelled = true; };
  }, [modalOpen, form.studentId, toast]);

  const routeMap = useMemo(() => {
    const map = new Map();
    routes.forEach((route) => map.set(String(route.id), route));
    return map;
  }, [routes]);

  const vehicleMap = useMemo(() => {
    const map = new Map();
    vehicles.forEach((vehicle) => map.set(String(vehicle.id), vehicle));
    return map;
  }, [vehicles]);

  const selectedRoute = routeMap.get(String(form.routeId)) || null;
  const stopOptions = useMemo(() => {
    const stops = normalizeRouteStops(selectedRoute?.stops);
    return stops.map((stop) => ({
      value: String(stop.id),
      label: `${stop.sequence}. ${stop.name}${Number.isFinite(stop.lat) ? '' : ' (no map)'}`,
    }));
  }, [selectedRoute]);

  const vehicleOptions = useMemo(() => {
    const list = form.routeId
      ? vehicles.filter((vehicle) => {
        const vehicleRouteId = String(vehicle.routeId || vehicle.route_id || '');
        return !vehicleRouteId || vehicleRouteId === String(form.routeId);
      })
      : vehicles;
    return list.map((vehicle) => ({
      value: String(vehicle.id),
      label: vehicle.vehicleNumber || vehicle.vehicle_number || vehicle.id,
    }));
  }, [vehicles, form.routeId]);

  const enriched = useMemo(() => items.map((item) => {
    const route = routeMap.get(String(item.routeId));
    const vehicle = vehicleMap.get(String(item.vehicleId));
    const stop = normalizeRouteStops(route?.stops).find((s) => String(s.id) === String(item.stopId));
    return {
      ...item,
      routeName: route?.name || item.routeName || '—',
      vehicleNumber: vehicle?.vehicleNumber || vehicle?.vehicle_number || item.vehicleNumber || '—',
      stopName: stop?.name || item.stopName || '—',
      studentLabel: item.studentName || item.studentId || '—',
      addressLabel: item.pickupAddressLabel || '—',
    };
  }), [items, routeMap, vehicleMap]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return enriched;
    return enriched.filter((item) => [
      item.studentLabel,
      item.routeName,
      item.vehicleNumber,
      item.stopName,
      item.addressLabel,
      item.status,
    ].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [enriched, search]);

  const columns = useMemo(() => [
    { key: 'studentLabel', label: 'Student', primary: true },
    { key: 'vehicleNumber', label: 'Vehicle' },
    { key: 'routeName', label: 'Route' },
    { key: 'stopName', label: 'Pickup stop' },
    { key: 'addressLabel', label: 'Home address' },
    { key: 'status', label: 'Status', badge: true },
  ], []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setAddress(EMPTY_ADDRESS);
    setStudentMeta(null);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      classId: item.classId || '',
      studentId: item.studentId || '',
      routeId: item.routeId || '',
      stopId: item.stopId || '',
      vehicleId: item.vehicleId || '',
      status: item.status || 'active',
    });
    setModalOpen(true);
  };

  const patchForm = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'classId') next.studentId = '';
      if (key === 'routeId') {
        next.stopId = '';
        const linkedVehicle = vehicles.find(
          (vehicle) => String(vehicle.routeId || vehicle.route_id || '') === String(value),
        );
        if (linkedVehicle) next.vehicleId = String(linkedVehicle.id);
      }
      return next;
    });
  };

  const handleSuggestStop = async () => {
    if (!selectedRoute) {
      toast('Select a route first.', 'warning');
      return;
    }
    if (!isTransportAddressComplete(address)) {
      toast('Add the student home address first, then suggest a stop.', 'warning');
      return;
    }
    setSuggesting(true);
    try {
      const result = await suggestNearestStop(address, normalizeRouteStops(selectedRoute.stops));
      if (!result.stop) {
        toast(result.error || 'No nearby stop found.', 'warning');
        return;
      }
      patchForm('stopId', String(result.stop.id));
      const km = result.distanceMeters != null ? ` (~${Math.round(result.distanceMeters)} m)` : '';
      toast(`Suggested stop: ${result.stop.name}${km}`, 'success');
    } catch (err) {
      toast(err?.message || 'Unable to suggest stop.', 'error');
    } finally {
      setSuggesting(false);
    }
  };

  const handleSave = async () => {
    if (!form.classId || !form.studentId) {
      toast('Select class and student.', 'warning');
      return;
    }
    if (!form.routeId || !form.stopId || !form.vehicleId) {
      toast('Select route, pickup stop, and vehicle.', 'warning');
      return;
    }
    if (!isTransportAddressComplete(address)) {
      toast('Home address (street + city or PIN) is required for pickup matching.', 'warning');
      return;
    }

    setSaving(true);
    try {
      await updateStudentTransportAddress(form.studentId, address);
      const studentOption = studentOptions.find((option) => String(option.value) === String(form.studentId));
      const route = routeMap.get(String(form.routeId));
      const vehicle = vehicleMap.get(String(form.vehicleId));
      const stop = normalizeRouteStops(route?.stops).find((s) => String(s.id) === String(form.stopId));
      const payload = {
        classId: form.classId,
        studentId: form.studentId,
        routeId: form.routeId,
        stopId: form.stopId,
        vehicleId: form.vehicleId,
        status: form.status || 'active',
        // Display fields only — relationship keys above are authoritative.
        studentName: studentOption?.label || studentMeta?.fullName || '',
        className: classOptions.find((option) => String(option.value) === String(form.classId))?.label || '',
        routeName: route?.name || '',
        stopName: stop?.name || '',
        vehicleNumber: vehicle?.vehicleNumber || vehicle?.vehicle_number || '',
        pickupAddressLabel: formatTransportAddress(address),
      };

      if (editing) {
        await transportAssignmentService.update(editing.id, payload);
        toast('Assignment updated. Student is linked to this vehicle/route.', 'success');
      } else {
        await transportAssignmentService.create(payload);
        toast('Student assigned to vehicle and route.', 'success');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast(err?.message || 'Unable to save assignment.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await transportAssignmentService.remove(deleteId);
      toast('Assignment removed.', 'success');
      setDeleteId(null);
      await load();
    } catch (err) {
      toast(err?.message || 'Unable to delete assignment.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="Student Transport Assignments"
          subtitle="Link enrolled students to a vehicle, route, and pickup stop using their home address."
          actions={(
            <div className="flex flex-wrap gap-2">
              <Link to="../live" relative="path"><Button variant="secondary">Live tracking</Button></Link>
              <Link to="../routes" relative="path"><Button variant="secondary">Routes</Button></Link>
              <Button onClick={openCreate}><Plus size={16} /> Assign student</Button>
            </div>
          )}
        />

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[#d0d5dd] bg-white px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#667085]">1 · Student</p>
            <p className="mt-1 text-sm text-[#344054]">Pick class → enrolled student (from enrollment).</p>
          </div>
          <div className="rounded-xl border border-[#d0d5dd] bg-white px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#667085]">2 · Home address</p>
            <p className="mt-1 text-sm text-[#344054]">Use enrollment address, or fill it if missing.</p>
          </div>
          <div className="rounded-xl border border-[#d0d5dd] bg-white px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#667085]">3 · Vehicle + stop</p>
            <p className="mt-1 text-sm text-[#344054]">Assign bus/route; suggest nearest mapped stop.</p>
          </div>
        </div>

        <div className="mb-4">
          <div className="relative max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#667085]" />
            <input
              className="input-premium h-11 w-full rounded-lg border border-[#c5c6cd] bg-[#f8f9ff] pl-10 pr-4 text-sm outline-none focus:border-[#0058be]"
              placeholder="Search student, vehicle, route, stop…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading assignments…" />
        ) : items.length === 0 ? (
          <EmptyState
            title="No students assigned to transport yet"
            description="Assign an enrolled student to a vehicle and pickup stop so parents can track the correct bus."
            action={<Button onClick={openCreate}>Assign student</Button>}
          />
        ) : (
          <ResponsiveDataTable
            columns={columns}
            data={filtered}
            emptyMessage="No assignments match your search."
            minWidth={980}
            renderActions={(item) => (
              <>
                <TableActionButton variant="outline" onClick={() => openEdit(item)}>Edit</TableActionButton>
                <TableActionButton variant="danger" onClick={() => setDeleteId(item.id)}>
                  <Trash2 size={14} /> Remove
                </TableActionButton>
              </>
            )}
          />
        )}

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? 'Edit transport assignment' : 'Assign student to vehicle'}
          size="xl"
          footer={(
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button loading={saving} onClick={handleSave}>Save assignment</Button>
            </>
          )}
        >
          <div className="space-y-5">
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#0b1c30]">
                <UserRound size={16} className="text-[#0058be]" /> Student
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <Select
                  label="Class"
                  required
                  value={form.classId}
                  options={classOptions}
                  placeholder={classesLoading ? 'Loading classes…' : 'Select class'}
                  disabled={classesLoading}
                  error={classesError || undefined}
                  onChange={(event) => patchForm('classId', event.target.value)}
                />
                <Select
                  label="Student"
                  required
                  value={form.studentId}
                  options={studentOptions}
                  placeholder={
                    !form.classId
                      ? 'Select class first'
                      : (studentsLoading ? 'Loading students…' : 'Select student')
                  }
                  disabled={!form.classId || studentsLoading}
                  error={studentsError || undefined}
                  onChange={(event) => patchForm('studentId', event.target.value)}
                />
              </div>
              {!classesLoading && !classesError && classOptions.length === 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  No active classes found. Add classes under Class Management first.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-[#d0d5dd] bg-[#f8f9ff] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-bold text-[#0b1c30]">
                  <MapPin size={16} className="text-[#0058be]" /> Home / pickup address
                </h3>
                {studentMeta && (
                  <span className={`text-xs font-semibold ${studentMeta.addressComplete ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {studentMeta.addressComplete ? 'From enrollment' : 'Missing — please complete'}
                  </span>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Textarea
                    label="Street address"
                    required
                    value={address.currentAddress}
                    onChange={(event) => setAddress((current) => ({ ...current, currentAddress: event.target.value }))}
                    placeholder="House / street from enrollment"
                  />
                </div>
                <Input
                  label="City"
                  required
                  value={address.city}
                  onChange={(event) => setAddress((current) => ({ ...current, city: event.target.value }))}
                />
                <Input
                  label="State"
                  value={address.state}
                  onChange={(event) => setAddress((current) => ({ ...current, state: event.target.value }))}
                />
                <Input
                  label="PIN code"
                  value={address.pinCode}
                  onChange={(event) => setAddress((current) => ({ ...current, pinCode: event.target.value }))}
                />
                <Input
                  label="Country"
                  value={address.country}
                  onChange={(event) => setAddress((current) => ({ ...current, country: event.target.value }))}
                />
              </div>
            </section>

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#0b1c30]">
                <Bus size={16} className="text-[#0058be]" /> Vehicle, route & stop
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <Select
                  label="Route"
                  required
                  value={form.routeId}
                  options={routes.map((route) => ({ value: String(route.id), label: route.name }))}
                  placeholder="Select route"
                  onChange={(event) => patchForm('routeId', event.target.value)}
                />
                <Select
                  label="Vehicle"
                  required
                  value={form.vehicleId}
                  options={vehicleOptions}
                  placeholder="Select vehicle"
                  onChange={(event) => patchForm('vehicleId', event.target.value)}
                />
                <Select
                  label="Pickup stop"
                  required
                  value={form.stopId}
                  options={stopOptions}
                  placeholder={form.routeId ? 'Select stop' : 'Select route first'}
                  disabled={!form.routeId}
                  onChange={(event) => patchForm('stopId', event.target.value)}
                />
                <Select
                  label="Status"
                  value={form.status}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                  onChange={(event) => patchForm('status', event.target.value)}
                />
              </div>
              <Button
                className="mt-3"
                variant="secondary"
                loading={suggesting}
                disabled={!form.routeId}
                onClick={handleSuggestStop}
              >
                Suggest nearest stop from address
              </Button>
            </section>
          </div>
        </Modal>

        <ConfirmModal
          open={Boolean(deleteId)}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDelete}
          title="Remove assignment?"
          message="This student will no longer be linked to the vehicle/route for live tracking."
          confirmText="Remove"
          confirmVariant="danger"
          loading={saving}
        />
      </PageTransition>
    </DashboardLayout>
  );
}
