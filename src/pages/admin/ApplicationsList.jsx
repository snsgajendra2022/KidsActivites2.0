import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader, SearchField } from '../../components/ui/index.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Select from '../../components/ui/Select.jsx';
import {
  ResponsiveDataTable,
  TableActionLink,
} from '../../components/ui/DataTable.jsx';
import { getApplications } from '../../services/enrollmentService.js';
import { STATUS_LABELS } from '../../constants/enrollmentStatuses.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import '../../styles/admin-modules.css';

const APP_COLUMNS = [
  { key: 'applicationNo', label: 'Application No.', primary: true },
  {
    label: 'Student Name',
    render: (app) => app.student?.fullName || app.formData?.child?.fullName,
  },
  {
    label: 'Form Type',
    muted: true,
    render: (app) => (app.formType === 'kidzee_printable' ? 'Kidzee' : 'Standard'),
  },
  {
    label: 'Class',
    render: (app) => app.student?.classApplying?.toUpperCase(),
  },
  {
    label: 'Parent Name',
    render: (app) => app.parent?.fatherName || app.parent?.motherName || app.parent?.guardianName,
  },
  {
    label: 'Mobile',
    render: (app) => app.parent?.fatherMobile || app.parent?.motherMobile,
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
  const { tenantPath } = useTenantPath();
  const [apps, setApps] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  const loadApplications = useCallback((nextPage = 0) => {
    let cancelled = false;
    setLoading(true);
    const filters = { page: nextPage, size: pageSize };
    if (statusFilter) filters.status = statusFilter;

    getApplications(filters)
      .then((result) => {
        if (cancelled) return;
        setApps(Array.isArray(result?.items) ? result.items : []);
        setPage(result?.page ?? nextPage);
        setTotalPages(result?.totalPages ?? 0);
        setTotal(result?.total ?? 0);
      })
      .catch(() => {
        if (!cancelled) {
          setApps([]);
          setTotalPages(0);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [statusFilter]);

  useEffect(() => {
    setPage(0);
    return loadApplications(0);
  }, [loadApplications]);

  const filtered = apps.filter((a) => {
    const studentName = a.student?.fullName || a.formData?.child?.fullName || '';
    const matchSearch = !search
      || studentName.toLowerCase().includes(search.toLowerCase())
      || a.applicationNo?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

  const kpiCards = useMemo(() => {
    const pending = apps.filter((a) => ['submitted', 'under_review', 'documents_pending', 'correction_required'].includes(a.status)).length;
    const approved = apps.filter((a) => ['approved', 'admission_confirmed', 'account_created'].includes(a.status)).length;
    return [
      { label: 'Total', value: total || apps.length, hint: 'All applications' },
      { label: 'Showing', value: filtered.length, hint: 'Current filters' },
      { label: 'In review', value: pending, hint: 'Needs attention' },
      { label: 'Approved', value: approved, hint: 'Progressed' },
    ];
  }, [apps, filtered.length, total]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Enrollment Applications"
        subtitle="Review, approve, and manage all enrollment applications."
        actions={(
          <Link
            to={tenantPath('/admin/enrollment/kidzee-print-form')}
            className="premium-btn premium-btn-primary premium-btn-sm"
          >
            <Plus size={16} aria-hidden />
            New enrollment form
          </Link>
        )}
      />

      <div className="admin-record-toolbar">
        <SearchField
          className="min-w-[200px] flex-1"
          maxWidthClass=""
          placeholder="Search by name or application no."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          options={statusOptions}
          placeholder="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="min-w-[200px]"
          variant="enrollment"
        />
      </div>

      {!loading && apps.length > 0 && (
        <div className="admin-record-kpi">
          {kpiCards.map((card) => (
            <div key={card.label} className="admin-record-kpi__card">
              <p className="admin-record-kpi__label">{card.label}</p>
              <p className="admin-record-kpi__value">{card.value}</p>
              <p className="admin-record-kpi__hint">{card.hint}</p>
            </div>
          ))}
        </div>
      )}

      <ResponsiveDataTable
        layout="cards"
        columns={APP_COLUMNS}
        data={filtered}
        minWidth={1000}
        emptyMessage={loading ? 'Loading applications…' : 'No enrollment applications found.'}
        renderActions={(app) => (
          <TableActionLink to={`/admin/applications/${app.id}`}>View Application</TableActionLink>
        )}
      />
      {!loading && totalPages > 1 && (
        <div className="sb-list-footer mt-4 flex items-center justify-between text-sm text-[#45474c]">
          <span>
            Showing page {page + 1} of {totalPages} ({total} applications)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="premium-btn premium-btn-outline premium-btn-sm disabled:opacity-50"
              disabled={page <= 0}
              onClick={() => loadApplications(page - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="premium-btn premium-btn-outline premium-btn-sm disabled:opacity-50"
              disabled={page + 1 >= totalPages}
              onClick={() => loadApplications(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
