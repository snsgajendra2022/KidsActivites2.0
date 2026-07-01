import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Select from '../../components/ui/Select.jsx';
import {
  ResponsiveDataTable,
  TableActionLink,
} from '../../components/ui/DataTable.jsx';
import { getApplications } from '../../services/enrollmentService.js';
import { STATUS_LABELS } from '../../constants/enrollmentStatuses.js';

const APP_COLUMNS = [
  { key: 'applicationNo', label: 'Application No.', primary: true },
  {
    label: 'Student Name',
    render: (app) => app.student?.fullName,
  },
  {
    label: 'Class',
    render: (app) => app.student?.classApplying?.toUpperCase(),
  },
  {
    label: 'Parent Name',
    render: (app) => app.parent?.fatherName,
  },
  {
    label: 'Mobile',
    render: (app) => app.parent?.fatherMobile,
  },
  {
    label: 'Status',
    badge: true,
    render: (app) => <StatusBadge status={app.status} />,
  },
  {
    label: 'Submitted Date',
    muted: true,
    render: (app) => (app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '—'),
  },
  {
    label: 'Reviewer',
    muted: true,
    render: (app) => app.assignedReviewer || '—',
  },
];

export default function ApplicationsList() {
  const [apps, setApps] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { getApplications().then(setApps); }, []);

  const filtered = apps.filter((a) => {
    const matchSearch = !search || a.student?.fullName?.toLowerCase().includes(search.toLowerCase()) || a.applicationNo?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

  return (
    <DashboardLayout>
      <PageHeader title="Enrollment Applications" subtitle="Review, approve, and manage all enrollment applications." />

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#45474c]" />
          <input
            className="input-premium h-11 w-full rounded-lg border border-[#c5c6cd] bg-[#f8f9ff] pl-10 pr-4 text-sm outline-none focus:border-[#0058be] focus:shadow-[0_0_0_4px_rgba(0,88,190,0.1)]"
            placeholder="Search by name or application no."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          options={statusOptions}
          placeholder="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="min-w-[200px]"
          variant="enrollment"
        />
      </div>

      <ResponsiveDataTable
        columns={APP_COLUMNS}
        data={filtered}
        minWidth={1000}
        emptyMessage="No enrollment applications found."
        renderActions={(app) => (
          <TableActionLink to={`/admin/applications/${app.id}`}>View Application</TableActionLink>
        )}
      />
    </DashboardLayout>
  );
}
