import ModuleCrudPage from '../../components/modules/ModuleCrudPage.jsx';
import TransportRoutesManagePage from './TransportRoutesManagePage.jsx';
import { transportVehicleService } from '../../services/schoolModules/index.js';

const vehicleColumns = [
  { key: 'vehicleNumber', label: 'Vehicle', primary: true },
  { key: 'driverName', label: 'Driver' },
  { key: 'driverPhone', label: 'Phone' },
  { key: 'routeName', label: 'Route' },
  { key: 'capacity', label: 'Capacity' },
  { key: 'status', label: 'Status', badge: true },
];

const vehicleFields = [
  { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
  { key: 'driverName', label: 'Driver Name', required: true },
  { key: 'driverPhone', label: 'Driver Phone', required: true },
  { key: 'attendantName', label: 'Attendant' },
  { key: 'routeName', label: 'Route Name', required: true },
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
];

export function TransportVehiclesPage() {
  return (
    <ModuleCrudPage
      title="Transport Vehicles"
      subtitle="Bus details, drivers, attendants, and capacity."
      service={transportVehicleService}
      columns={vehicleColumns}
      fields={vehicleFields}
      createLabel="Add Vehicle"
      searchKeys={['vehicleNumber', 'driverName', 'routeName', 'status']}
    />
  );
}

export function TransportRoutesPage() {
  return <TransportRoutesManagePage />;
}
