import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, AlertCircle, FolderOpen, CreditCard, CheckCircle, XCircle, UserPlus, Clock,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader, StatCard } from '../../components/ui/index.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { getApplications, getDashboardStats } from '../../services/enrollmentService.js';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    setStats(getDashboardStats());
    getApplications().then((apps) => setRecent(apps.slice(0, 5)));
  }, []);

  return (
    <DashboardLayout>
      <PageHeader title="Admin Dashboard" subtitle="Overview of enrollment applications and pending actions." />

      <div className="stats-grid">
        <StatCard icon={FileText} value={stats?.total ?? '—'} label="Total Applications" />
        <StatCard icon={Clock} value={stats?.pendingReview ?? '—'} label="Pending Review" />
        <StatCard icon={AlertCircle} value={stats?.correctionRequired ?? '—'} label="Correction Required" />
        <StatCard icon={FolderOpen} value={stats?.documentsPending ?? '—'} label="Documents Pending" />
        <StatCard icon={CreditCard} value={stats?.feePending ?? '—'} label="Fee Pending" />
        <StatCard icon={CheckCircle} value={stats?.feeSubmitted ?? '—'} label="Payment Submitted" />
        <StatCard icon={CheckCircle} value={stats?.confirmed ?? '—'} label="Admissions Confirmed" />
        <StatCard icon={UserPlus} value={stats?.accountsCreated ?? '—'} label="Accounts Created" />
        <StatCard icon={XCircle} value={stats?.rejected ?? '—'} label="Rejected Applications" />
      </div>

      <div className="section-head" style={{ marginTop: 32 }}>
        <h2 className="section-title">Recent Applications</h2>
        <Link to="/admin/applications" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 14 }}>View All</Link>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Application No.</th>
              <th>Student Name</th>
              <th>Class</th>
              <th>Parent</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((app) => (
              <tr key={app.id}>
                <td>{app.applicationNo}</td>
                <td>{app.student?.fullName}</td>
                <td>{app.student?.classApplying?.toUpperCase()}</td>
                <td>{app.parent?.fatherName}</td>
                <td><StatusBadge status={app.status} /></td>
                <td>{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '—'}</td>
                <td><Link to={`/admin/applications/${app.id}`} className="btn btn-outline btn-sm">Review</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
