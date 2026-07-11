import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, CreditCard, FolderOpen, Image, MessageCircle, Bell, ArrowRight,
  AlertTriangle, User, Building2, GraduationCap, Plus, Mail, Phone,
} from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import BentoStatCard from '../../components/dashboard/BentoStatCard.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { getParentDashboard } from '../../services/parentService.js';
import { getFeeByApplication } from '../../services/feeService.js';
import { ENROLLMENT_STATUSES } from '../../constants/enrollmentStatuses.js';
import '../../styles/parent-dashboard.css';

function statusBadgeVariant(status) {
  if (status === ENROLLMENT_STATUSES.ADMISSION_CONFIRMED || status === ENROLLMENT_STATUSES.ACCOUNT_CREATED) return 'success';
  if (status === ENROLLMENT_STATUSES.REJECTED || status === ENROLLMENT_STATUSES.CORRECTION_REQUIRED) return 'danger';
  if (status === ENROLLMENT_STATUSES.FEE_PENDING) return 'warning';
  return 'info';
}

export default function ParentDashboard() {
  const { user } = useAuth();
  const { tenantPath } = useTenantPath();
  const [data, setData] = useState(null);
  const [fees, setFees] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getParentDashboard(user.id, user.schoolId, user)
      .then(async (dashboard) => {
        setData(dashboard);
        const feeMap = {};
        await Promise.all(
          dashboard.children.map(async (child) => {
            const fee = await getFeeByApplication(child.applicationId);
            if (fee) feeMap[child.applicationId] = fee;
          }),
        );
        setFees(feeMap);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <AppLayout>
        <LoadingState message="Loading your dashboard…" />
      </AppLayout>
    );
  }

  const { parent, school, children, summary, enrollPath } = data || {};
  const enrollmentHref = enrollPath || tenantPath('/enrollment/kidzee-print-form');
  const pendingActions = [];
  children?.forEach((child) => {
    if (child.status === ENROLLMENT_STATUSES.CORRECTION_REQUIRED) {
      pendingActions.push({
        label: `Correction required — ${child.student?.fullName}`,
        to: tenantPath(`/parent/enrollment?child=${child.applicationId}`),
        urgent: true,
      });
    }
    if (child.status === ENROLLMENT_STATUSES.FEE_PENDING) {
      pendingActions.push({
        label: `Fee payment pending — ${child.student?.fullName}`,
        to: tenantPath('/parent/fees'),
        urgent: true,
      });
    }
  });

  const quickLinks = [
    { to: tenantPath('/parent/enrollment'), icon: FileText, label: 'Enrollment Status', desc: `${children?.length || 0} child(ren)`, color: 'bg-[#dce9ff] text-[#0058be]' },
    { to: tenantPath('/parent/fees'), icon: CreditCard, label: 'Fees', desc: 'Payments & receipts', color: 'bg-[#e8f5ef] text-[#059669]' },
    { to: tenantPath('/parent/documents'), icon: FolderOpen, label: 'Documents', desc: 'Uploads & verification', color: 'bg-[#fff4e5] text-[#d97706]' },
    { to: tenantPath('/parent/photos'), icon: Image, label: 'Photos', desc: 'From teachers', color: 'bg-[#f3e8ff] text-[#7c3aed]' },
    { to: tenantPath('/parent/messages'), icon: MessageCircle, label: 'Messages', desc: 'Chat with school', color: 'bg-[#e0f2fe] text-[#0284c7]' },
    { to: tenantPath('/parent/notifications'), icon: Bell, label: 'Notifications', desc: 'Updates & alerts', color: 'bg-[#fce7f3] text-[#db2777]' },
  ];

  return (
    <AppLayout>
      <PageTransition>
        <div className="premium-page-header">
          <h1 className="premium-page-title">Parent Dashboard</h1>
          <p className="premium-page-subtitle">
            Welcome back, {parent?.name}. Manage your children&apos;s admission at {school?.name}.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="sb-card p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-brand">
              <User size={18} /> Parent Information
            </h2>
            <dl className="grid gap-3 text-sm">
              <div><dt className="text-xs font-semibold uppercase text-muted">Name</dt><dd className="font-medium text-brand">{parent?.name}</dd></div>
              <div className="flex items-center gap-2"><Mail size={14} className="text-muted" /><dd>{parent?.email}</dd></div>
              <div className="flex items-center gap-2"><Phone size={14} className="text-muted" /><dd>{parent?.mobile}</dd></div>
            </dl>
          </section>

          <section className="sb-card p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-brand">
              <Building2 size={18} /> School
            </h2>
            <dl className="grid gap-3 text-sm">
              <div><dt className="text-xs font-semibold uppercase text-muted">School</dt><dd className="font-medium text-brand">{school?.name}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-muted">Academic Year</dt><dd>{school?.academicYear}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-muted">Address</dt><dd>{school?.address}</dd></div>
            </dl>
          </section>
        </div>

        <div className="parent-dashboard-children-head">
          <h2 className="parent-dashboard-children-title">
            <GraduationCap size={20} aria-hidden />
            My Children
          </h2>
        </div>

        {!children?.length ? (
          <div className="parent-dashboard-empty">
            <div className="parent-dashboard-empty__icon" aria-hidden>
              <FileText size={28} />
            </div>
            <h3>No Enrollments Yet</h3>
            <p>
              Start an enrollment application for your child at {school?.name}.
            </p>
            <Link to={enrollmentHref} className="parent-dashboard-enroll-btn">
              <Plus size={16} aria-hidden />
              Start Enrollment
            </Link>
          </div>
        ) : (
          <>
            <div className="bento-grid mb-6">
              <div className="bento-span-4">
                <BentoStatCard icon={GraduationCap} value={summary?.totalChildren ?? 0} label="Children Enrolled" variant="indigo" />
              </div>
              <div className="bento-span-4">
                <BentoStatCard icon={FileText} value={summary?.activeApplications ?? 0} label="Active Applications" variant="emerald" />
              </div>
              <div className="bento-span-4">
                <BentoStatCard icon={AlertTriangle} value={summary?.pendingActions ?? 0} label="Pending Actions" variant={summary?.pendingActions ? 'amber' : 'sky'} />
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
              {children.map((child) => {
                const fee = fees[child.applicationId];
                const docEntries = child.documents ? Object.values(child.documents) : [];
                const docsVerified = docEntries.filter((d) => d?.status === 'verified').length;
                return (
                  <article key={child.applicationId} className="sb-card p-5">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display text-lg font-bold text-brand">{child.student?.fullName || 'Student'}</h3>
                        <p className="text-xs text-muted">
                          {child.applicationNo || 'Draft'} · Class {child.student?.classApplying?.toUpperCase() || '—'}
                        </p>
                      </div>
                      <StatusBadge variant={statusBadgeVariant(child.status)}>{child.statusLabel}</StatusBadge>
                    </div>
                    <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-xs text-muted">Date of Birth</dt><dd>{child.student?.dateOfBirth || '—'}</dd></div>
                      <div><dt className="text-xs text-muted">Gender</dt><dd className="capitalize">{child.student?.gender || '—'}</dd></div>
                      <div><dt className="text-xs text-muted">Blood Group</dt><dd>{child.student?.bloodGroup || '—'}</dd></div>
                      <div><dt className="text-xs text-muted">Fee</dt><dd>{fee ? `₹${fee.total?.toLocaleString()}` : '—'}</dd></div>
                      <div><dt className="text-xs text-muted">Documents</dt><dd>{docsVerified}/{docEntries.length} verified</dd></div>
                      <div><dt className="text-xs text-muted">Submitted</dt><dd>{child.submittedAt ? new Date(child.submittedAt).toLocaleDateString() : '—'}</dd></div>
                    </dl>
                    <Link
                      to={tenantPath(`/parent/enrollment?child=${child.applicationId}`)}
                      className="premium-btn premium-btn-secondary premium-btn-sm"
                    >
                      View Details <ArrowRight size={14} />
                    </Link>
                  </article>
                );
              })}
            </div>

            <Link to={enrollmentHref} className="parent-dashboard-enroll-card">
              <span className="parent-dashboard-enroll-card__icon" aria-hidden>
                <Plus size={22} />
              </span>
              <span className="parent-dashboard-enroll-card__text">
                <strong>Enroll Another Child</strong>
                <span>Start a new application for a sibling at {school?.name}</span>
              </span>
              <ArrowRight size={18} className="parent-dashboard-enroll-card__arrow" aria-hidden />
            </Link>

            {pendingActions.length > 0 && (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-[#091426]">
                  <AlertTriangle size={18} className="text-amber-600" />
                  Pending Actions
                </h3>
                <div className="space-y-2">
                  {pendingActions.map((action) => (
                    <div key={action.label} className="flex flex-col gap-3 rounded-xl border border-amber-100 bg-white/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium text-[#091426]">{action.label}</span>
                      <Link to={action.to} className="premium-btn premium-btn-primary premium-btn-sm shrink-0">Take Action</Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-3 font-display text-base font-bold text-[#091426]">Quick Access</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {quickLinks.map(({ to, icon: Icon, label, desc, color }) => (
                  <Link key={to} to={to} className="sb-card group block p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                      <Icon size={20} />
                    </div>
                    <div className="text-sm font-semibold text-[#091426] group-hover:text-[#0058be]">{label}</div>
                    <div className="mt-1 text-xs text-[#45474c]">{desc}</div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </PageTransition>
    </AppLayout>
  );
}
