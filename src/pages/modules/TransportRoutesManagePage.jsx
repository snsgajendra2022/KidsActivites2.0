import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPinned, Plus, Trash2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { EmptyState, LoadingState, PageHeader, SearchField } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Modal, { ConfirmModal } from '../../components/ui/Modal.jsx';
import { ResponsiveDataTable, TableActionButton } from '../../components/ui/DataTable.jsx';
import RouteStopsEditor from '../../components/transport/RouteStopsEditor.jsx';
import RouteStopTimeline from '../../components/transport/RouteStopTimeline.jsx';
import { transportRouteService, transportVehicleService } from '../../services/schoolModules/index.js';
import {
  normalizeRouteStops,
  payloadStopsForApi,
  routeHasMappedStops,
  stopLabelSummary,
} from '../../utils/transportRouteGeo.js';
import { useToast } from '../../context/ToastContext.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { geocodeAddress } from '../../services/geocoding/placeSearch.js';
import '../../styles/admin-modules.css';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const EMPTY_FORM = {
  name: '',
  vehicleId: '',
  morningStart: '07:30',
  eveningStart: '14:30',
  status: 'active',
  stops: [],
};

export default function TransportRoutesManagePage() {
  const { toast } = useToast();
  const { config } = usePortalConfig();
  const schoolAddress = config?.school?.address || '';
  const [items, setItems] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLabel, setDeleteLabel] = useState('');
  const [schoolCenter, setSchoolCenter] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!schoolAddress.trim()) return undefined;
    geocodeAddress(schoolAddress, { latitude: 22.9734, longitude: 78.6569 })
      .then((place) => {
        if (!cancelled && place) setSchoolCenter([place.latitude, place.longitude]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [schoolAddress]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [routes, fleet] = await Promise.all([
        transportRouteService.list(),
        transportVehicleService.list().catch(() => []),
      ]);
      setItems(Array.isArray(routes) ? routes : []);
      setVehicles(Array.isArray(fleet) ? fleet : []);
    } catch (err) {
      toast(err?.message || 'Unable to load routes.', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => {
      const stopsText = stopLabelSummary(item.stops).toLowerCase();
      return [item.name, item.status, stopsText, item.morningStart, item.eveningStart]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [items, search]);

  const columns = useMemo(() => [
    { key: 'name', label: 'Route', primary: true },
    {
      key: 'path',
      label: 'Stop path (order)',
      render: (row) => {
        const list = normalizeRouteStops(row.stops);
        if (!list.length) return <span className="text-[#667085]">No stops</span>;
        return <RouteStopTimeline stops={list} compact />;
      },
    },
    {
      key: 'mapReady',
      label: 'Map ready',
      render: (row) => {
        const list = normalizeRouteStops(row.stops);
        const mapped = list.filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng)).length;
        if (!list.length) return '—';
        if (mapped === list.length) {
          return <span className="font-semibold text-emerald-700">Yes · {mapped}/{list.length}</span>;
        }
        return <span className="font-semibold text-amber-700">Partial · {mapped}/{list.length}</span>;
      },
    },
    { key: 'morningStart', label: 'Morning' },
    { key: 'eveningStart', label: 'Evening' },
    { key: 'status', label: 'Status', badge: true },
  ], []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, stops: [] });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name || '',
      vehicleId: item.vehicleId || item.vehicle_id || '',
      morningStart: item.morningStart || '07:30',
      eveningStart: item.eveningStart || '14:30',
      status: item.status || 'active',
      stops: normalizeRouteStops(item.stops),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast('Route name is required.', 'warning');
      return;
    }
    const stops = payloadStopsForApi(form.stops);
    if (!stops.length) {
      toast('Add at least one stop with a map location.', 'warning');
      return;
    }
    if (stops.some((stop) => stop.lat == null || stop.lng == null)) {
      toast('Every stop needs a valid map location. Use search or click the map.', 'warning');
      return;
    }
    if (!form.morningStart || !form.eveningStart) {
      toast('Morning and evening start times are required.', 'warning');
      return;
    }

    const payload = {
      name: form.name.trim(),
      vehicleId: form.vehicleId || null,
      morningStart: form.morningStart,
      eveningStart: form.eveningStart,
      status: form.status,
      stops,
    };

    setSaving(true);
    try {
      if (editing) {
        await transportRouteService.update(editing.id, payload);
        toast('Route updated. Mobile maps refresh within about 30 seconds (or reopen the live screen).', 'success');
      } else {
        await transportRouteService.create(payload);
        toast('Route created. Mobile maps refresh within about 30 seconds when open.', 'success');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast(err?.message || 'Unable to save route.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await transportRouteService.remove(deleteId);
      toast('Route deleted.', 'success');
      setDeleteId(null);
      setDeleteLabel('');
      await load();
    } catch (err) {
      toast(err?.message || 'Unable to delete route.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="Transport Routes & Stops"
          subtitle="Build each route as an ordered stop list with real map locations. Live tracking uses this path."
          actions={(
            <div className="flex flex-wrap gap-2">
              <Link to="../live" relative="path">
                <Button variant="secondary">
                  <MapPinned size={16} /> Open live tracking
                </Button>
              </Link>
              <Button onClick={openCreate}>
                <Plus size={16} /> Add Route
              </Button>
            </div>
          )}
        />

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[#d0d5dd] bg-white px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#667085]">Name the route</p>
            <p className="mt-1 text-sm text-[#344054]">e.g. North Route, Sector 7 Loop.</p>
          </div>
          <div className="rounded-xl border border-[#d0d5dd] bg-white px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#667085]">Add stops in order</p>
            <p className="mt-1 text-sm text-[#344054]">Select students — application address becomes map stops.</p>
          </div>
          <div className="rounded-xl border border-[#d0d5dd] bg-white px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#667085]">Track on live map</p>
            <p className="mt-1 text-sm text-[#344054]">
              {items.filter(routeHasMappedStops).length} of {items.length} routes ready for map.
            </p>
          </div>
        </div>

        <div className="admin-record-toolbar">
          <SearchField
            className="min-w-[200px] flex-1"
            maxWidthClass=""
            placeholder="Search routes or stops…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <LoadingState message="Loading routes…" />
        ) : items.length === 0 ? (
          <EmptyState
            title="No routes yet"
            description="Create a route with mapped stops so live tracking can draw the path."
            action={<Button onClick={openCreate}>Add Route</Button>}
          />
        ) : (
          <ResponsiveDataTable
            layout="cards"
            columns={columns}
            data={filtered}
            emptyMessage="No routes match your search."
            minWidth={860}
            renderActions={(item) => (
              <>
                <TableActionButton variant="outline" onClick={() => openEdit(item)}>
                  Edit
                </TableActionButton>
                <TableActionButton
                  variant="danger"
                  onClick={() => {
                    setDeleteId(item.id);
                    setDeleteLabel(item.name || '');
                  }}
                >
                  <Trash2 size={14} /> Delete
                </TableActionButton>
              </>
            )}
          />
        )}

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? `Edit route · ${editing.name || ''}` : 'Add route'}
          size="xl"
          footer={(
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button loading={saving} onClick={handleSave}>Save route</Button>
            </>
          )}
        >
          <div className="mb-4 rounded-xl border border-[#d0d5dd] bg-[#f8f9ff] px-4 py-3 text-sm text-[#344054]">
            <strong className="text-[#0b1c30]">Build stops from enrolled students:</strong>
            {' '}Select class → student. We read the address from their enrollment application, put it on the map, then draw the road path.
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Route name"
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="e.g. North Route"
            />
            <Select
              label="Assigned vehicle"
              value={form.vehicleId}
              placeholder="Optional"
              options={vehicles.map((vehicle) => ({
                value: String(vehicle.id),
                label: vehicle.vehicleNumber || vehicle.vehicle_number || vehicle.id,
              }))}
              onChange={(event) => setForm((current) => ({ ...current, vehicleId: event.target.value }))}
            />
            <Input
              label="Morning start"
              type="time"
              required
              value={form.morningStart}
              onChange={(event) => setForm((current) => ({ ...current, morningStart: event.target.value }))}
            />
            <Input
              label="Evening start"
              type="time"
              required
              value={form.eveningStart}
              onChange={(event) => setForm((current) => ({ ...current, eveningStart: event.target.value }))}
            />
            <Select
              label="Status"
              required
              value={form.status}
              options={STATUS_OPTIONS}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            />
            <div className="md:col-span-2 border-t border-[#eaecf0] pt-4">
              <h3 className="mb-1 text-sm font-bold text-[#0b1c30]">Stops & map locations</h3>
              <p className="mb-3 text-xs text-[#667085]">
                Add students from enrollment applications first. Then reorder stops and save — live tracking uses this path.
              </p>
              {modalOpen ? (
                <RouteStopsEditor
                  key={editing?.id || 'new-route'}
                  value={form.stops}
                  onChange={(stops) => setForm((current) => ({ ...current, stops }))}
                  initialCenter={schoolCenter}
                  searchBias={schoolCenter
                    ? { lat: schoolCenter[0], lng: schoolCenter[1] }
                    : undefined}
                />
              ) : null}
              {form.stops?.length > 0 && (
                <div className="mt-4 rounded-xl border border-[#d0d5dd] bg-white p-4">
                  <RouteStopTimeline stops={form.stops} title="Preview · stop order" />
                </div>
              )}
            </div>
          </div>
        </Modal>

        <ConfirmModal
          open={Boolean(deleteId)}
          onClose={() => {
            setDeleteId(null);
            setDeleteLabel('');
          }}
          onConfirm={handleDelete}
          title={deleteLabel ? `Delete ${deleteLabel}?` : 'Delete route?'}
          message="This removes the route definition. Live trips that reference it may stop showing a path."
          confirmText="Delete"
          confirmVariant="danger"
          loading={saving}
        />
      </PageTransition>
    </DashboardLayout>
  );
}
