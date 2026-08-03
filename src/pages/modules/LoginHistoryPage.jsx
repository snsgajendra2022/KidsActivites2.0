import { useMemo, useState } from 'react';
import ModuleCrudPage from '../../components/modules/ModuleCrudPage.jsx';
import Select from '../../components/ui/Select.jsx';
import { loginHistoryService } from '../../services/schoolModules/index.js';

const columns = [
  { key: 'userName', label: 'User', primary: true },
  { key: 'email', label: 'Email' },
  { key: 'ip', label: 'IP' },
  { key: 'device', label: 'Device' },
  {
    key: 'status',
    label: 'Status',
    badge: true,
    render: (row) => (
      <span className={`sb-status-badge sb-status-badge--${row.status === 'success' ? 'success' : 'danger'}`}>
        {row.status === 'success' ? 'Success' : 'Failed'}
      </span>
    ),
  },
  {
    key: 'failureReason',
    label: 'Failure reason',
    muted: true,
    render: (row) => (row.status === 'failed' ? (row.failureReason || '—') : '—'),
  },
  {
    key: 'createdAtLabel',
    label: 'Time',
    render: (row) => row.createdAtLabel || row.createdAt || '—',
  },
];

export default function LoginHistoryPage() {
  const [statusFilter, setStatusFilter] = useState('');

  const listFilters = useMemo(
    () => (statusFilter ? { status: statusFilter } : {}),
    [statusFilter],
  );

  return (
    <ModuleCrudPage
      title="Login History"
      subtitle="Live authentication attempts for this school workspace (success and failed)."
      service={loginHistoryService}
      columns={columns}
      fields={[]}
      readOnly
      listFilters={listFilters}
      searchKeys={['userName', 'email', 'ip', 'device', 'status', 'failureReason']}
      emptyTitle="No login events yet"
      emptyDescription="Login attempts will appear here once users sign in to this school portal."
      headerActions={(
        <div className="w-44">
          <Select
            label=""
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'success', label: 'Success' },
              { value: 'failed', label: 'Failed' },
            ]}
            placeholder="All statuses"
          />
        </div>
      )}
    />
  );
}
