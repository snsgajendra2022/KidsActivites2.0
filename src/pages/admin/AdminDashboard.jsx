import { Link } from 'react-router-dom';
import { Suspense, lazy, useDeferredValue } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText, AlertCircle, FolderOpen, CreditCard, CheckCircle, UserPlus, Clock, ArrowRight,
} from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import BentoStatCard from '../../components/dashboard/BentoStatCard.jsx';
import WelcomeBanner from '../../components/dashboard/WelcomeBanner.jsx';
import {
  ResponsiveDataTablePanel,
  DataTableToolbar,
  TableActionLink,
} from '../../components/ui/DataTable.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { getAdminDashboard } from '../../services/enrollmentService.js';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import UpcomingEventsWidget from '../../components/calendar/UpcomingEventsWidget.jsx';

const ApplicationsChart = lazy(() =>
  import('../../components/dashboard/ChartCards.jsx').then((m) => ({ default: m.ApplicationsChart })),
);
const FeeChart = lazy(() =>
  import('../../components/dashboard/ChartCards.jsx').then((m) => ({ default: m.FeeChart })),
);

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

const STAT_CARDS = [
  { icon: FileText, label: 'Total Applications', key: 'total', variant: 'indigo' },
  { icon: Clock, label: 'Pending Review', key: 'pendingReview', variant: 'amber' },
  { icon: AlertCircle, label: 'Correction Required', key: 'correctionRequired', variant: 'rose' },
  { icon: FolderOpen, label: 'Documents Pending', key: 'documentsPending', variant: 'sky' },
  { icon: CreditCard, label: 'Fee Pending', key: 'feePending', variant: 'amber' },
  { icon: CheckCircle, label: 'Payment Submitted', key: 'feeSubmitted', variant: 'sky' },
  { icon: CheckCircle, label: 'Admissions Confirmed', key: 'confirmed', variant: 'emerald' },
  { icon: UserPlus, label: 'Accounts Created', key: 'accountsCreated', variant: 'indigo' },
];

function ChartPlaceholder({ title }) {
  return (
    <div className="premium-card" style={{ height: 280 }} aria-hidden>
      <h3 className="card-title" style={{ marginBottom: 16 }}>{title}</h3>
      <div className="admin-dash-chart-skel" />
    </div>
  );
}

export default function AdminDashboard() {
  const { user, isDemoSession } = useAuth();
  const { school } = usePortalConfig();
  const { tenantSlug } = useTenant();
  const { tenantPath } = useTenantPath();

  const { data, isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['admin-dashboard', tenantSlug],
    queryFn: () => getAdminDashboard(5),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const deferredData = useDeferredValue(data);
  const stats = deferredData?.stats ?? null;
  const recent = deferredData?.recent ?? [];
  const chartData = deferredData?.charts ?? [];
  const showCharts = !isPending && Array.isArray(chartData);

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
            {isFetching && !isPending ? (
              <span className="ml-2 text-xs font-medium text-slate-500">Updating…</span>
            ) : null}
          </p>
        </div>

        <div className="bento-grid">
          <WelcomeBanner
            title="Admissions Overview"
            subtitle={`Manage enrollment applications, fee verification, and admissions for ${school?.academicYear || 'this year'}.`}
            badge={`${school?.academicYear || 'Admissions'} · Admissions Open`}
            actions={
              <>
                <Link to={tenantPath('/admin/applications')} className="premium-btn premium-btn-white premium-btn-sm">
                  View Applications <ArrowRight size={16} />
                </Link>
                <Link to={tenantPath('/admin/enrollment/kidzee-print-form')} className="premium-btn premium-btn-white premium-btn-sm">
                  New enrollment form
                </Link>
                <Link to={tenantPath('/admin/fees')} className="premium-btn premium-btn-white premium-btn-sm">Fee Management</Link>
              </>
            }
          />

          {isError ? (
            <div className="bento-span-12 admin-dash-error" role="alert">
              <p>{error?.message || 'Could not load dashboard stats.'}</p>
              <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          ) : null}

          {STAT_CARDS.map(({ icon, label, key, variant }) => (
            <div key={key} className="bento-span-3">
              <BentoStatCard
                icon={icon}
                value={isPending ? '…' : (stats?.[key] ?? '—')}
                label={label}
                variant={variant}
              />
            </div>
          ))}

          <div className="bento-span-8">
            {showCharts ? (
              <Suspense fallback={<ChartPlaceholder title="Application Trends" />}>
                <ApplicationsChart data={chartData} />
              </Suspense>
            ) : (
              <ChartPlaceholder title="Application Trends" />
            )}
          </div>
          <div className="bento-span-4">
            {showCharts ? (
              <Suspense fallback={<ChartPlaceholder title="Fee Collection" />}>
                <FeeChart data={chartData} />
              </Suspense>
            ) : (
              <ChartPlaceholder title="Fee Collection" />
            )}
          </div>

          <div className="bento-span-12">
            <UpcomingEventsWidget
              role={user?.role}
              userId={user?.id}
              calendarPath="/admin/calendar"
              title="Upcoming school events"
              light
            />
          </div>

          <div className="bento-span-12">
            <ResponsiveDataTablePanel
              minWidth={900}
              columns={RECENT_COLUMNS}
              data={isPending ? [] : recent}
              emptyMessage={isPending ? 'Loading recent applications…' : 'No recent applications'}
              toolbar={(
                <DataTableToolbar
                  title="Recent Applications"
                  subtitle="Latest enrollment submissions"
                  actions={(
                    <Link to={tenantPath('/admin/applications')} className="table-action-btn table-action-btn-outline">
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
