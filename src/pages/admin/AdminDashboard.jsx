import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, AlertCircle, FolderOpen, CreditCard, CheckCircle, XCircle, UserPlus, Clock, ArrowRight,
} from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import BentoStatCard from '../../components/dashboard/BentoStatCard.jsx';
import { ApplicationsChart, FeeChart, WelcomeBanner } from '../../components/dashboard/ChartCards.jsx';
import {
  DataTablePanel,
  DataTableToolbar,
  TableActionLink,
  TableActionCell,
  TableMutedCell,
  TablePrimaryCell,
} from '../../components/ui/DataTable.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { getApplications, getDashboardStats } from '../../services/enrollmentService.js';
import { SCHOOL } from '../../data/mockSchool.js';
import { useAuth } from '../../context/AuthContext.jsx';

const CHART_DATA = [
  { month: 'Jan', applications: 12, collected: 420000 },
  { month: 'Feb', applications: 18, collected: 580000 },
  { month: 'Mar', applications: 24, collected: 720000 },
  { month: 'Apr', applications: 31, collected: 890000 },
  { month: 'May', applications: 28, collected: 950000 },
  { month: 'Jun', applications: 35, collected: 1100000 },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    setStats(getDashboardStats());
    getApplications().then((apps) => setRecent(apps.slice(0, 5)));
  }, []);

  return (
    <AppLayout>
      <PageTransition>
        <div className="premium-page-header">
          <h1 className="premium-page-title">Admin Dashboard</h1>
          <p className="premium-page-subtitle">Welcome back, {user?.name}. Here&apos;s what&apos;s happening at {SCHOOL.name}.</p>
        </div>

        <div className="bento-grid">
          <WelcomeBanner
            title="Admissions Overview"
            subtitle={`Manage enrollment applications, fee verification, and admissions for ${SCHOOL.academicYear}.`}
            badge={`${SCHOOL.academicYear} · Admissions Open`}
            actions={
              <>
                <Link to="/admin/applications" className="premium-btn premium-btn-white premium-btn-sm">
                  View Applications <ArrowRight size={16} />
                </Link>
                <Link to="/admin/fees" className="premium-btn premium-btn-white premium-btn-sm">Fee Management</Link>
              </>
            }
          />

          <div className="bento-span-3"><BentoStatCard icon={FileText} value={stats?.total ?? '—'} label="Total Applications" change="+12% this month" variant="indigo" /></div>
          <div className="bento-span-3"><BentoStatCard icon={Clock} value={stats?.pendingReview ?? '—'} label="Pending Review" variant="amber" /></div>
          <div className="bento-span-3"><BentoStatCard icon={AlertCircle} value={stats?.correctionRequired ?? '—'} label="Correction Required" variant="rose" /></div>
          <div className="bento-span-3"><BentoStatCard icon={FolderOpen} value={stats?.documentsPending ?? '—'} label="Documents Pending" variant="sky" /></div>
          <div className="bento-span-3"><BentoStatCard icon={CreditCard} value={stats?.feePending ?? '—'} label="Fee Pending" variant="amber" /></div>
          <div className="bento-span-3"><BentoStatCard icon={CheckCircle} value={stats?.feeSubmitted ?? '—'} label="Payment Submitted" variant="sky" /></div>
          <div className="bento-span-3"><BentoStatCard icon={CheckCircle} value={stats?.confirmed ?? '—'} label="Admissions Confirmed" change="+8%" variant="emerald" /></div>
          <div className="bento-span-3"><BentoStatCard icon={UserPlus} value={stats?.accountsCreated ?? '—'} label="Accounts Created" variant="indigo" /></div>

          <div className="bento-span-8"><ApplicationsChart data={CHART_DATA} /></div>
          <div className="bento-span-4"><FeeChart data={CHART_DATA} /></div>

          <div className="bento-span-12">
            <DataTablePanel
              minWidth={900}
              toolbar={(
                <DataTableToolbar
                  title="Recent Applications"
                  subtitle="Latest enrollment submissions"
                  actions={(
                    <Link to="/admin/applications" className="table-action-btn table-action-btn-outline">
                      View All
                    </Link>
                  )}
                />
              )}
            >
              <thead>
                <tr>
                  <th>Application No.</th>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Parent</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th className="!text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((app) => (
                  <tr key={app.id}>
                    <TablePrimaryCell>{app.applicationNo}</TablePrimaryCell>
                    <td>{app.student?.fullName}</td>
                    <td>{app.student?.classApplying?.toUpperCase()}</td>
                    <td>{app.parent?.fatherName}</td>
                    <td><StatusBadge status={app.status} /></td>
                    <TableMutedCell>
                      {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '—'}
                    </TableMutedCell>
                    <TableActionCell showDash={false}>
                      <TableActionLink to={`/admin/applications/${app.id}`}>Review</TableActionLink>
                    </TableActionCell>
                  </tr>
                ))}
              </tbody>
            </DataTablePanel>
          </div>
        </div>
      </PageTransition>
    </AppLayout>
  );
}
