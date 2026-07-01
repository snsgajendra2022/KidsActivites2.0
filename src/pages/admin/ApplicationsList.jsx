import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { getApplications } from '../../services/enrollmentService.js';
import { STATUS_LABELS } from '../../constants/enrollmentStatuses.js';

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

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--muted)' }} />
          <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search by name or application no." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select options={statusOptions} placeholder="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ minWidth: 200 }} />
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Application No.</th>
              <th>Student Name</th>
              <th>Class</th>
              <th>Parent Name</th>
              <th>Mobile</th>
              <th>Status</th>
              <th>Submitted Date</th>
              <th>Reviewer</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No enrollment applications found.</td></tr>
            ) : filtered.map((app) => (
              <tr key={app.id}>
                <td>{app.applicationNo}</td>
                <td>{app.student?.fullName}</td>
                <td>{app.student?.classApplying?.toUpperCase()}</td>
                <td>{app.parent?.fatherName}</td>
                <td>{app.parent?.fatherMobile}</td>
                <td><StatusBadge status={app.status} /></td>
                <td>{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '—'}</td>
                <td>{app.assignedReviewer || '—'}</td>
                <td><Link to={`/admin/applications/${app.id}`} className="btn btn-outline btn-sm">View Application</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
