import { useEffect, useMemo, useState } from 'react';
import ModuleCrudPage from '../../components/modules/ModuleCrudPage.jsx';
import TransportRoutesManagePage from './TransportRoutesManagePage.jsx';
import {
  transportRouteService,
  transportVehicleService,
} from '../../services/schoolModules/index.js';

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

  useEffect(() => {
    let cancelled = false;
    transportRouteService.list()
      .then((routes) => {
        if (cancelled) return;
        setRouteOptions((routes || []).map((route) => ({
          value: String(route.id),
          label: route.name,
          meta: { routeName: route.name, routeId: route.id },
        })));
      })
      .catch(() => {
        if (!cancelled) setRouteOptions([]);
      });
    return () => { cancelled = true; };
  }, []);

  const vehicleFields = useMemo(() => [
    { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
    { key: 'driverName', label: 'Driver Name', required: true },
    { key: 'driverPhone', label: 'Driver Phone', required: true },
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
  ], [routeOptions]);

  return (
    <ModuleCrudPage
      title="Transport Vehicles"
      subtitle="Bus details and which route each vehicle serves. Assign students under Student Bus Assignments."
      service={transportVehicleService}
      columns={vehicleColumns}
      fields={vehicleFields}
      createLabel="Add Vehicle"
      searchKeys={['vehicleNumber', 'driverName', 'routeName', 'status']}
      transformCreate={(form) => {
        const selected = routeOptions.find((option) => String(option.value) === String(form.routeId));
        return {
          vehicleNumber: form.vehicleNumber,
          driverName: form.driverName,
          driverPhone: form.driverPhone,
          attendantName: form.attendantName || '',
          routeId: form.routeId,
          routeName: selected?.label || form.routeName || '',
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
