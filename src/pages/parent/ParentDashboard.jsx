import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText, CreditCard, FolderOpen, Image, MessageCircle, Bell, ArrowRight, AlertTriangle,
} from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import BentoStatCard from '../../components/dashboard/BentoStatCard.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getApplicationByParent } from '../../services/enrollmentService.js';
import { getFeeByApplication } from '../../services/feeService.js';
import { ENROLLMENT_STATUSES } from '../../constants/enrollmentStatuses.js';
import { STATUS_LABELS } from '../../constants/enrollmentStatuses.js';

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
  if (app?.status === ENROLLMENT_STATUSES.CORRECTION_REQUIRED) pendingActions.push({ label: 'Correction required on your application', to: '/parent/enrollment', urgent: true });
  if (app?.status === ENROLLMENT_STATUSES.FEE_PENDING) pendingActions.push({ label: 'Fee payment pending', to: '/parent/fees', urgent: true });
  if (fee?.status === 'payment_submitted') pendingActions.push({ label: 'Payment under verification', to: '/parent/fees' });

  const quickLinks = [
    { to: '/parent/enrollment', icon: FileText, label: 'Enrollment Status', desc: app ? STATUS_LABELS[app.status] : 'Track progress' },
    { to: '/parent/fees', icon: CreditCard, label: 'Fees', desc: fee ? `₹${fee.total?.toLocaleString()} assigned` : 'View fee details' },
    { to: '/parent/documents', icon: FolderOpen, label: 'Documents', desc: 'Upload & track status' },
    { to: '/parent/photos', icon: Image, label: 'Photos', desc: 'From teachers' },
    { to: '/parent/messages', icon: MessageCircle, label: 'Messages', desc: 'Chat with school' },
    { to: '/parent/notifications', icon: Bell, label: 'Notifications', desc: 'Updates & alerts' },
  ];

  return (
    <AppLayout>
      <PageTransition>
        <div className="premium-page-header">
          <h1 className="premium-page-title">Parent Dashboard</h1>
          <p className="premium-page-subtitle">Welcome back, {user?.name}. Track your child&apos;s admission journey.</p>
        </div>

        {!app ? (
          <motion.div className="premium-card" style={{ textAlign: 'center', padding: 64 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="premium-feature-icon" style={{ margin: '0 auto 20px', width: 64, height: 64 }}><FileText size={28} /></div>
            <h3 className="card-title" style={{ fontSize: 20 }}>No Active Enrollment</h3>
            <p className="text-muted" style={{ marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>Start your child&apos;s enrollment application to track admission status, fees, and documents.</p>
            <Link to="/enroll" className="premium-btn premium-btn-primary premium-btn-lg">Start Enrollment Application</Link>
          </motion.div>
        ) : (
          <div className="bento-grid">
            <motion.div
              className="welcome-banner bento-span-12"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p style={{ fontSize: 13, opacity: 0.7, margin: '0 0 4px' }}>Enrollment Status</p>
              <h2>{app.student?.fullName}</h2>
              <p>Application {app.applicationNo} · Class {app.student?.classApplying?.toUpperCase()}</p>
              <div style={{ marginTop: 16 }}><StatusBadge status={app.status} /></div>
              <div className="welcome-banner-actions">
                <Link to="/parent/enrollment" className="premium-btn premium-btn-white premium-btn-sm">View Full Status <ArrowRight size={14} /></Link>
              </div>
            </motion.div>

            {pendingActions.length > 0 && (
              <div className="bento-span-12 premium-card" style={{ borderColor: 'var(--warning)', background: 'linear-gradient(135deg, #fffbeb, #fff)' }}>
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={18} color="var(--warning)" /> Pending Actions
                </h3>
                {pendingActions.map((a) => (
                  <div key={a.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--line-soft)' }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{a.label}</span>
                    <Link to={a.to} className="premium-btn premium-btn-primary premium-btn-sm">Take Action</Link>
                  </div>
                ))}
              </div>
            )}

            <div className="bento-span-6 premium-card">
              <h3 className="card-title">Status Timeline</h3>
              <div className="premium-timeline" style={{ marginTop: 16 }}>
                {(app.statusHistory || []).slice(-4).map((h, i) => (
                  <div key={i} className="premium-timeline-item done">
                    <div className="premium-timeline-dot">✓</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{STATUS_LABELS[h.status]}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>{h.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bento-span-6">
              <div className="bento-grid" style={{ gap: 12 }}>
                {quickLinks.map(({ to, icon: Icon, label, desc }) => (
                  <Link key={to} to={to} className="bento-span-6" style={{ textDecoration: 'none' }}>
                    <motion.div className="premium-card premium-card-flat" whileHover={{ y: -2, boxShadow: 'var(--shadow-md)' }} style={{ padding: 18 }}>
                      <Icon size={22} color="var(--primary)" style={{ marginBottom: 10 }} />
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy)' }}>{label}</div>
                      <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>{desc}</div>
                    </motion.div>
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
