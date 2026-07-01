import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, CreditCard, FolderOpen, Image, MessageCircle, Bell, ArrowRight, AlertTriangle,
  CheckCircle2, Clock,
} from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import BentoStatCard from '../../components/dashboard/BentoStatCard.jsx';
import { WelcomeBanner } from '../../components/dashboard/ChartCards.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getApplicationByParent } from '../../services/enrollmentService.js';
import { getFeeByApplication } from '../../services/feeService.js';
import { ENROLLMENT_STATUSES, STATUS_LABELS } from '../../constants/enrollmentStatuses.js';
import { SCHOOL } from '../../data/mockSchool.js';

export default function ParentDashboard() {
  const { user } = useAuth();
  const [app, setApp] = useState(null);
  const [fee, setFee] = useState(null);

  useEffect(() => {
    getApplicationByParent(user.id).then(async (data) => {
      setApp(data);
      if (data) setFee(await getFeeByApplication(data.id));
    });
  }, [user.id]);

  const pendingActions = [];
  if (app?.status === ENROLLMENT_STATUSES.CORRECTION_REQUIRED) {
    pendingActions.push({ label: 'Correction required on your application', to: '/parent/enrollment', urgent: true });
  }
  if (app?.status === ENROLLMENT_STATUSES.FEE_PENDING) {
    pendingActions.push({ label: 'Fee payment pending', to: '/parent/fees', urgent: true });
  }
  if (fee?.status === 'payment_submitted') {
    pendingActions.push({ label: 'Payment under verification', to: '/parent/fees' });
  }

  const docEntries = app?.documents ? Object.values(app.documents) : [];
  const docsVerified = docEntries.filter((d) => d?.status === 'verified').length;
  const docsPending = docEntries.filter((d) => !d?.status || d?.status === 'pending').length;

  const quickLinks = [
    { to: '/parent/enrollment', icon: FileText, label: 'Enrollment Status', desc: app ? STATUS_LABELS[app.status] : 'Track progress', color: 'bg-[#dce9ff] text-[#0058be]' },
    { to: '/parent/fees', icon: CreditCard, label: 'Fees', desc: fee ? `₹${fee.total?.toLocaleString()} assigned` : 'View fee details', color: 'bg-[#e8f5ef] text-[#059669]' },
    { to: '/parent/documents', icon: FolderOpen, label: 'Documents', desc: `${docsVerified}/${docEntries.length || 0} verified`, color: 'bg-[#fff4e5] text-[#d97706]' },
    { to: '/parent/photos', icon: Image, label: 'Photos', desc: 'From teachers', color: 'bg-[#f3e8ff] text-[#7c3aed]' },
    { to: '/parent/messages', icon: MessageCircle, label: 'Messages', desc: 'Chat with school', color: 'bg-[#e0f2fe] text-[#0284c7]' },
    { to: '/parent/notifications', icon: Bell, label: 'Notifications', desc: 'Updates & alerts', color: 'bg-[#fce7f3] text-[#db2777]' },
  ];

  return (
    <AppLayout>
      <PageTransition>
        <div className="premium-page-header">
          <h1 className="premium-page-title">Parent Dashboard</h1>
          <p className="premium-page-subtitle">
            Welcome back, {user?.name}. Track your child&apos;s admission journey at {SCHOOL.name}.
          </p>
        </div>

        {!app ? (
          <div className="sb-card mx-auto max-w-xl p-10 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#dce9ff] text-[#0058be]">
              <FileText size={28} />
            </div>
            <h3 className="mb-2 font-display text-xl font-bold text-[#091426]">No Active Enrollment</h3>
            <p className="mx-auto mb-6 max-w-sm text-sm leading-relaxed text-[#45474c]">
              Start your child&apos;s enrollment application to track admission status, fees, and documents.
            </p>
            <Link
              to="/enroll"
              className="sb-link-btn sb-link-btn--dark premium-btn premium-btn-primary premium-btn-lg inline-flex"
            >
              Start Enrollment
            </Link>
          </div>
        ) : (
          <div className="bento-grid">
            <WelcomeBanner
              title={app.student?.fullName}
              subtitle={`Application ${app.applicationNo} · Class ${app.student?.classApplying?.toUpperCase()}`}
              badge={STATUS_LABELS[app.status]}
              actions={(
                <Link to="/parent/enrollment" className="premium-btn premium-btn-white premium-btn-sm">
                  View Full Status <ArrowRight size={14} />
                </Link>
              )}
            />

            <div className="bento-span-3">
              <BentoStatCard
                icon={FileText}
                value={STATUS_LABELS[app.status]}
                label="Application Status"
                variant="indigo"
              />
            </div>
            <div className="bento-span-3">
              <BentoStatCard
                icon={CreditCard}
                value={fee ? `₹${fee.total?.toLocaleString()}` : '—'}
                label="Fee Assigned"
                variant="emerald"
              />
            </div>
            <div className="bento-span-3">
              <BentoStatCard
                icon={FolderOpen}
                value={`${docsVerified}/${docEntries.length}`}
                label="Documents Verified"
                variant={docsPending > 0 ? 'amber' : 'emerald'}
              />
            </div>
            <div className="bento-span-3">
              <BentoStatCard
                icon={Clock}
                value={app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '—'}
                label="Submitted On"
                variant="sky"
              />
            </div>

            {pendingActions.length > 0 && (
              <div className="bento-span-12 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-[#091426]">
                  <AlertTriangle size={18} className="text-amber-600" />
                  Pending Actions
                </h3>
                <div className="space-y-2">
                  {pendingActions.map((action) => (
                    <div
                      key={action.label}
                      className="flex flex-col gap-3 rounded-xl border border-amber-100 bg-white/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="text-sm font-medium text-[#091426]">{action.label}</span>
                      <Link
                        to={action.to}
                        className="sb-link-btn sb-link-btn--dark premium-btn premium-btn-primary premium-btn-sm shrink-0"
                      >
                        Take Action
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bento-span-6 premium-card p-5 md:p-6">
              <h3 className="mb-4 font-display text-base font-bold text-[#091426]">Status Timeline</h3>
              <div className="premium-timeline space-y-1">
                {(app.statusHistory || []).slice(-5).map((h, i) => (
                  <div key={i} className="premium-timeline-item done flex gap-3 py-3">
                    <div className="premium-timeline-dot flex h-8 w-8 shrink-0 items-center justify-center text-xs">
                      <CheckCircle2 size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#091426]">{STATUS_LABELS[h.status]}</div>
                      <div className="mt-0.5 text-xs text-[#45474c]">{h.note}</div>
                      <div className="mt-1 text-[11px] text-[#6b7a8c]">
                        {new Date(h.date).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bento-span-6">
              <h3 className="mb-3 font-display text-base font-bold text-[#091426]">Quick Access</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {quickLinks.map(({ to, icon: Icon, label, desc, color }) => (
                  <Link
                    key={to}
                    to={to}
                    className="sb-card group block p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                      <Icon size={20} />
                    </div>
                    <div className="text-sm font-semibold text-[#091426] group-hover:text-[#0058be]">{label}</div>
                    <div className="mt-1 text-xs text-[#45474c]">{desc}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </PageTransition>
    </AppLayout>
  );
}
