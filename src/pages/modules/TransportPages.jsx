import { useEffect, useMemo, useState } from 'react';
import ModuleCrudPage from '../../components/modules/ModuleCrudPage.jsx';
import TransportRoutesManagePage from './TransportRoutesManagePage.jsx';
import {
  transportRouteService,
  transportVehicleService,
} from '../../services/schoolModules/index.js';
import { listDrivers } from '../../services/driverService.js';

const vehicleColumns = [
  { key: 'vehicleNumber', label: 'Vehicle', primary: true },
  { key: 'driverName', label: 'Driver' },
  { key: 'driverPhone', label: 'Phone' },
  { key: 'routeName', label: 'Route' },
  { key: 'capacity', label: 'Capacity' },
  { key: 'status', label: 'Status', badge: true },
];

export function TransportVehiclesPage() {
  const [routeOptions, setRouteOptions] = useState([]);
  const [driverOptions, setDriverOptions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      transportRouteService.list().catch(() => []),
      listDrivers().catch(() => []),
    ]).then(([routes, drivers]) => {
      if (cancelled) return;
      setRouteOptions((routes || []).map((route) => ({
        value: String(route.id),
        label: route.name,
        meta: { routeName: route.name, routeId: route.id },
      })));
      setDriverOptions((drivers || [])
        .filter((driver) => driver.active !== false)
        .map((driver) => ({
          value: String(driver.userId || driver.id),
          label: `${driver.name || 'Driver'}${driver.mobile ? ` · ${driver.mobile}` : ''}`,
          meta: {
            driverName: driver.name || '',
            driverPhone: driver.mobile || '',
            driverUserId: driver.userId || driver.id,
          },
        })));
    });
    return () => { cancelled = true; };
  }, []);

  const vehicleFields = useMemo(() => [
    { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
    {
      key: 'driverUserId',
      label: 'Assigned driver',
      type: 'select',
      options: driverOptions,
      helpText: 'Select a driver account (role=driver). Create drivers under Transport → Drivers.',
      metaKeys: ['driverName', 'driverPhone'],
    },
    { key: 'attendantName', label: 'Attendant' },
    {
      key: 'routeId',
      label: 'Assigned route',
      type: 'select',
      required: true,
      options: routeOptions,
      helpText: 'Students assigned to this route will ride this vehicle.',
      metaKeys: ['routeName'],
    },
    { key: 'capacity', label: 'Capacity', type: 'number', required: true, defaultValue: '40' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'maintenance', label: 'Maintenance' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
  ], [driverOptions, routeOptions]);

  return (
    <ModuleCrudPage
      title="Transport Vehicles"
      subtitle="Bus details, assigned driver account, and which route each vehicle serves. Assign students under Student Bus Assignments."
      service={transportVehicleService}
      columns={vehicleColumns}
      fields={vehicleFields}
      createLabel="Add Vehicle"
      searchKeys={['vehicleNumber', 'driverName', 'routeName', 'status']}
      deleteLabel="Delete"
      deleteTitle="Delete vehicle?"
      deleteMessage="This removes the vehicle from transport. Reassign students and drivers on other vehicles before the next trip."
      transformCreate={(form) => {
        const selectedRoute = routeOptions.find((option) => String(option.value) === String(form.routeId));
        const selectedDriver = driverOptions.find((option) => String(option.value) === String(form.driverUserId));
        return {
          vehicleNumber: form.vehicleNumber,
          driverUserId: form.driverUserId || null,
          // Display-only; backend resolves names from driverUserId.
          driverName: selectedDriver?.meta?.driverName || form.driverName || '',
          driverPhone: selectedDriver?.meta?.driverPhone || form.driverPhone || '',
          attendantName: form.attendantName || '',
          routeId: form.routeId,
          routeName: selectedRoute?.label || form.routeName || '',
          capacity: Number(form.capacity) || 40,
          status: form.status || 'active',
        };
      }}
      headerActions={null}
    />
  );
}

export function TransportRoutesPage() {
  return <TransportRoutesManagePage />;
}
