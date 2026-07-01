import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, AlertCircle, FolderOpen, CreditCard, CheckCircle, UserPlus, Clock, ArrowRight,
} from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import BentoStatCard from '../../components/dashboard/BentoStatCard.jsx';
import { ApplicationsChart, FeeChart, WelcomeBanner } from '../../components/dashboard/ChartCards.jsx';
import {
  ResponsiveDataTablePanel,
  DataTableToolbar,
  TableActionLink,
} from '../../components/ui/DataTable.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { getApplications, getDashboardStats, getDashboardChartData } from '../../services/enrollmentService.js';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const RECENT_COLUMNS = [
  { key: 'applicationNo', label: 'Application No.', primary: true },
  { label: 'Student Name', render: (app) => app.student?.fullName },
  { label: 'Class', render: (app) => app.student?.classApplying?.toUpperCase() },
  { label: 'Parent', render: (app) => app.parent?.fatherName },
  {
    label: 'Status',
    badge: true,
    render: (app) => <StatusBadge status={app.status} />,
  },
  {
    label: 'Submitted',
    muted: true,
    render: (app) => (app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '—'),
  },
];

export default function AdminDashboard() {
  const { user, isDemoSession } = useAuth();
  const { school } = usePortalConfig();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    getDashboardStats().then(setStats);
    getApplications().then((apps) => setRecent(apps.slice(0, 5)));
    getDashboardChartData().then(setChartData);
  }, []);

  return (
    <AppLayout>
      <PageTransition>
        <div className="premium-page-header">
          <h1 className="premium-page-title">Admin Dashboard</h1>
          <p className="premium-page-subtitle">
            Welcome back, {user?.name}. Here&apos;s what&apos;s happening at {school?.name}.
            {isDemoSession && (
              <span className="ml-2 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                Demo data
              </span>
            )}
          </p>
        </div>

        <div className="bento-grid">
          <WelcomeBanner
            title="Admissions Overview"
            subtitle={`Manage enrollment applications, fee verification, and admissions for ${school?.academicYear}.`}
            badge={`${school?.academicYear} · Admissions Open`}
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

          <div className="bento-span-8"><ApplicationsChart data={chartData} /></div>
          <div className="bento-span-4"><FeeChart data={chartData} /></div>

          <div className="bento-span-12">
            <ResponsiveDataTablePanel
              minWidth={900}
              columns={RECENT_COLUMNS}
              data={recent}
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
              renderActions={(app) => (
                <TableActionLink to={`/admin/applications/${app.id}`}>Review</TableActionLink>
              )}
            />
          </div>
        </div>
      </PageTransition>
    </AppLayout>
  );
}
