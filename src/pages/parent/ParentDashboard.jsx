import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, CreditCard, FolderOpen, Image, MessageCircle, Bell, ArrowRight,
  AlertCircle, GraduationCap, Plus, Users, Clock, CheckCircle,
} from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import BentoStatCard from '../../components/dashboard/BentoStatCard.jsx';
import { WelcomeBanner } from '../../components/dashboard/ChartCards.jsx';
import {
  ResponsiveDataTablePanel,
  DataTableToolbar,
  TableActionLink,
} from '../../components/ui/DataTable.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { getParentDashboard } from '../../services/parentService.js';
import { ENROLLMENT_STATUSES } from '../../constants/enrollmentStatuses.js';
import '../../styles/parent-dashboard.css';

function countDocsPending(documents) {
  const entries = documents ? Object.values(documents) : [];
  return entries.filter((d) => d?.status !== 'verified').length;
}

function buildPendingActions(children, tenantPath) {
  const actions = [];
  children?.forEach((child) => {
    const name = child.student?.fullName || child.studentName || 'Student';
    if (child.status === ENROLLMENT_STATUSES.CORRECTION_REQUIRED) {
      actions.push({
        id: `correction-${child.applicationId}`,
        label: `Update application for ${name}`,
        hint: 'Correction requested by the school',
        to: tenantPath(`/parent/enrollment?child=${child.applicationId}`),
      });
    }
    if (child.status === ENROLLMENT_STATUSES.FEE_PENDING) {
      actions.push({
        id: `fee-${child.applicationId}`,
        label: `Complete fee payment for ${name}`,
        hint: 'Payment required to proceed',
        to: tenantPath('/parent/fees'),
      });
    }
    if (child.status === ENROLLMENT_STATUSES.DOCUMENTS_PENDING) {
      actions.push({
        id: `docs-${child.applicationId}`,
        label: `Upload documents for ${name}`,
        hint: 'Required documents are missing',
        to: tenantPath('/parent/documents'),
      });
    }
  });
  return actions;
}

function computeStats(children, summary) {
  const list = children || [];
  const feeDue = list.filter(
    (c) => c.status === ENROLLMENT_STATUSES.FEE_PENDING
      || c.feeSummary?.status === ENROLLMENT_STATUSES.FEE_PENDING,
  ).length;
  const docsPending = list.reduce((acc, c) => acc + countDocsPending(c.documents), 0);

  return {
    totalChildren: summary?.totalChildren ?? list.length,
    activeApplications: summary?.activeApplications
      ?? list.filter((c) => c.status !== ENROLLMENT_STATUSES.REJECTED).length,
    pendingActions: summary?.pendingActions
      ?? list.filter((c) => [
        ENROLLMENT_STATUSES.CORRECTION_REQUIRED,
        ENROLLMENT_STATUSES.FEE_PENDING,
        ENROLLMENT_STATUSES.DOCUMENTS_PENDING,
      ].includes(c.status)).length,
    feeDue,
    docsPending,
  };
}

const QUICK_LINKS = [
  { key: 'enrollment', icon: FileText, label: 'Enrollment', path: '/parent/enrollment' },
  { key: 'fees', icon: CreditCard, label: 'Fees', path: '/parent/fees' },
  { key: 'documents', icon: FolderOpen, label: 'Documents', path: '/parent/documents' },
  { key: 'photos', icon: Image, label: 'Photos', path: '/parent/photos' },
  { key: 'messages', icon: MessageCircle, label: 'Messages', path: '/parent/messages' },
  { key: 'notifications', icon: Bell, label: 'Alerts', path: '/parent/notifications' },
];

const CHILDREN_COLUMNS = [
  {
    label: 'Student Name',
    primary: true,
    render: (child) => child.student?.fullName || child.studentName || '—',
  },
  { key: 'applicationNo', label: 'Application No.' },
  {
    label: 'Class',
    render: (child) => child.className || child.student?.classApplying?.toUpperCase() || '—',
  },
  {
    label: 'Status',
    badge: true,
    render: (child) => <StatusBadge status={child.status} />,
  },
  {
    label: 'Fee',
    render: (child) => {
      const fee = child.feeSummary;
      if (!fee?.total && !fee?.status) return '—';
      return (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          {fee.total != null && (
            <span>₹{Number(fee.total).toLocaleString('en-IN')}</span>
          )}
          {fee.status && <StatusBadge status={fee.status} />}
        </span>
      );
    },
  },
  {
    label: 'Documents',
    muted: true,
    render: (child) => {
      const pending = countDocsPending(child.documents);
      const total = child.documents ? Object.keys(child.documents).length : 0;
      if (!total) return '—';
      if (pending === 0) return 'All verified';
      return `${pending} pending`;
    },
  },
];

export default function ParentDashboard() {
  const { user } = useAuth();
  const { tenantPath } = useTenantPath();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    getParentDashboard(user.id, user.schoolId, user)
      .then(setData)
      .finally(() => setLoading(false));
  }, [user]);

  const quickLinks = useMemo(
    () => QUICK_LINKS.map((link) => ({ ...link, to: tenantPath(link.path) })),
    [tenantPath],
  );

  if (loading) {
    return (
      <AppLayout>
        <LoadingState message="Loading your dashboard…" />
      </AppLayout>
    );
  }

  const { parent, school, children = [], summary } = data || {};
  const enrollmentHref = tenantPath('/enrollment/kidzee-print-form');
  const pendingActions = buildPendingActions(children, tenantPath);
  const stats = computeStats(children, summary);

  return (
    <AppLayout>
      <PageTransition>
        <div className="premium-page-header">
          <h1 className="premium-page-title">Parent Dashboard</h1>
          <p className="premium-page-subtitle">
            Welcome back, {parent?.name || user?.name}. Track enrollment and stay connected with {school?.name || 'your school'}.
            {school?.academicYear && (
              <span className="ml-2 text-xs font-medium text-[#0058be] bg-[#0058be]/10 px-2 py-0.5 rounded-full">
                {school.academicYear}
              </span>
            )}
          </p>
        </div>

        <div className="bento-grid">
          <WelcomeBanner
            title="Your Family Hub"
            subtitle={`Manage enrollments, fees, documents, and school updates for ${school?.academicYear || 'this academic year'}.`}
            badge={school?.name ? `${school.name} · Parent Portal` : 'Parent Portal'}
            actions={
              children.length > 0 ? (
                <>
                  <Link to={tenantPath('/parent/enrollment')} className="premium-btn premium-btn-white premium-btn-sm">
                    View Enrollment <ArrowRight size={16} />
                  </Link>
                  <Link to={tenantPath('/parent/photos')} className="premium-btn premium-btn-white premium-btn-sm">
                    Class Photos
                  </Link>
                </>
              ) : (
                <Link to={enrollmentHref} className="premium-btn premium-btn-white premium-btn-sm">
                  <Plus size={16} /> Start Enrollment
                </Link>
              )
            }
          />

          <div className="bento-span-3">
            <BentoStatCard icon={Users} value={stats.totalChildren} label="My Children" variant="indigo" />
          </div>
          <div className="bento-span-3">
            <BentoStatCard icon={FileText} value={stats.activeApplications} label="Active Applications" variant="emerald" />
          </div>
          <div className="bento-span-3">
            <BentoStatCard icon={AlertCircle} value={stats.pendingActions} label="Pending Actions" variant="amber" />
          </div>
          <div className="bento-span-3">
            <BentoStatCard
              icon={CreditCard}
              value={stats.feeDue || '—'}
              label="Fee Due"
              variant="rose"
            />
          </div>

          {!children.length ? (
            <div className="bento-span-12">
              <div className="premium-card parent-dashboard-empty">
                <div className="parent-dashboard-empty__icon" aria-hidden>
                  <GraduationCap size={28} />
                </div>
                <h2 className="card-title">Start your first enrollment</h2>
                <p className="text-muted" style={{ margin: '0 auto 1.5rem', maxWidth: 420 }}>
                  Begin an application for your child at {school?.name || 'your school'}.
                </p>
                <Link to={enrollmentHref} className="premium-btn premium-btn-primary premium-btn-sm">
                  <Plus size={16} aria-hidden />
                  Start Enrollment
                </Link>
              </div>
            </div>
          ) : (
            <>
              {pendingActions.length > 0 && (
                <div className="bento-span-12">
                  <div className="premium-card parent-dashboard-pending">
                    <div className="parent-dashboard-pending__head">
                      <AlertCircle size={20} aria-hidden />
                      <div>
                        <h3 className="card-title" style={{ margin: 0 }}>Needs your attention</h3>
                        <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                          {pendingActions.length} {pendingActions.length === 1 ? 'item' : 'items'} waiting on you
                        </p>
                      </div>
                    </div>
                    <ul className="parent-dashboard-pending__list">
                      {pendingActions.map((action) => (
                        <li key={action.id}>
                          <Link to={action.to} className="parent-dashboard-pending__item">
                            <span className="parent-dashboard-pending__item-text">
                              <strong>{action.label}</strong>
                              <span>{action.hint}</span>
                            </span>
                            <ArrowRight size={16} aria-hidden />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="bento-span-12">
                <ResponsiveDataTablePanel
                  minWidth={880}
                  columns={CHILDREN_COLUMNS}
                  data={children}
                  keyExtractor={(child) => child.applicationId}
                  toolbar={(
                    <DataTableToolbar
                      title="My Children"
                      subtitle="Enrollment status, fees, and documents at a glance"
                      actions={(
                        <>
                          <Link to={enrollmentHref} className="table-action-btn table-action-btn-outline">
                            <Plus size={14} /> Enroll Another
                          </Link>
                          <Link to={tenantPath('/parent/enrollment')} className="table-action-btn table-action-btn-outline">
                            View All
                          </Link>
                        </>
                      )}
                    />
                  )}
                  renderActions={(child) => (
                    <TableActionLink to={`/parent/enrollment?child=${child.applicationId}`}>
                      View
                    </TableActionLink>
                  )}
                />
              </div>
            </>
          )}

          <div className="bento-span-12">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="card-title" style={{ margin: 0 }}>Quick Access</h3>
            </div>
            <div className="parent-dashboard-quicklinks">
              {quickLinks.map(({ key, to, icon: Icon, label }) => (
                <Link key={key} to={to} className="parent-dashboard-quicklink">
                  <span className="parent-dashboard-quicklink__icon" aria-hidden>
                    <Icon size={20} />
                  </span>
                  <span className="parent-dashboard-quicklink__label">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          {children.length > 0 && stats.docsPending > 0 && (
            <div className="bento-span-6">
              <div className="premium-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div className="premium-feature-icon" style={{ width: 40, height: 40, margin: 0 }}>
                    <FolderOpen size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>
                      Documents Pending
                    </h4>
                    <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
                      {stats.docsPending} document{stats.docsPending === 1 ? '' : 's'} still need verification or upload.
                    </p>
                    <Link to={tenantPath('/parent/documents')} className="premium-btn premium-btn-secondary premium-btn-sm" style={{ marginTop: 12 }}>
                      Manage Documents <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {children.length > 0 && (
            <div className={stats.docsPending > 0 ? 'bento-span-6' : 'bento-span-12'}>
              <div className="premium-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div className="premium-feature-icon" style={{ width: 40, height: 40, margin: 0 }}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>
                      Stay Connected
                    </h4>
                    <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
                      View class photos, messages, and school notifications for enrolled children.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                      <Link to={tenantPath('/parent/photos')} className="premium-btn premium-btn-secondary premium-btn-sm">
                        Photos
                      </Link>
                      <Link to={tenantPath('/parent/messages')} className="premium-btn premium-btn-secondary premium-btn-sm">
                        Messages
                      </Link>
                      <Link to={tenantPath('/parent/notifications')} className="premium-btn premium-btn-primary premium-btn-sm">
                        Notifications <CheckCircle size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </PageTransition>
    </AppLayout>
  );
}
