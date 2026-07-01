import { useEffect, useState, useMemo } from 'react';
import { Search, Shield } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { ResponsiveDataTable } from '../../components/ui/DataTable.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getAuditLogs, AUDIT_ACTION_LABELS } from '../../services/auditService.js';
import { ROLE_LABELS } from '../../constants/roles.js';
import '../../styles/admin-modules.css';

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  ...Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ value, label })),
];

const AUDIT_COLUMNS = [
  {
    label: 'Time',
    primary: true,
    render: (row) => new Date(row.timestamp).toLocaleString(),
  },
  {
    label: 'User',
    render: (row) => row.userName,
  },
  {
    label: 'Role',
    muted: true,
    render: (row) => ROLE_LABELS[row.role] || row.role,
  },
  {
    label: 'Action',
    badge: true,
    render: (row) => (
      <span className="admin-badge admin-badge--info">
        {AUDIT_ACTION_LABELS[row.action] || row.action}
      </span>
    ),
  },
  {
    label: 'Summary',
    render: (row) => row.summary,
  },
  {
    label: 'Resource',
    muted: true,
    render: (row) => row.resourceId || '—',
  },
  {
    label: 'IP',
    muted: true,
    hideOnMobile: true,
    render: (row) => row.ipAddress,
  },
];

export default function AdminAuditLogs() {
  const { isDemoSession } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filters = useMemo(() => ({
    search: search.trim() || undefined,
    action: action || undefined,
    from: from || undefined,
    to: to ? `${to}T23:59:59` : undefined,
  }), [search, action, from, to]);

  useEffect(() => {
    setLoading(true);
    getAuditLogs(filters)
      .then(setLogs)
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Audit Logs"
        subtitle="Track all system actions and changes."
        actions={isDemoSession && <span className="admin-demo-badge">Demo data</span>}
      />

      <section className="sb-card admin-modules-panel">
        <div className="admin-audit-filters">
          <div className="admin-audit-search">
            <Search size={16} className="admin-audit-search__icon" />
            <input
              type="search"
              placeholder="Search user, summary, or resource ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            label="Action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            options={ACTION_OPTIONS}
          />
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </section>

      <section className="sb-card admin-modules-panel admin-modules-panel--flush">
        <div className="admin-modules-panel__head">
          <div className="admin-audit-head">
            <Shield size={18} />
            <div>
              <h3 className="admin-modules-panel__title">Activity Log</h3>
              <p className="admin-modules-panel__subtitle">
                {loading ? 'Loading…' : `${logs.length} event${logs.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="admin-modules-loading admin-modules-loading--inline" />
        ) : (
          <ResponsiveDataTable
            nested
            columns={AUDIT_COLUMNS}
            data={logs}
            keyExtractor={(row) => row.id}
            minWidth={900}
            emptyMessage="No audit events match your filters."
          />
        )}
      </section>
    </DashboardLayout>
  );
}
