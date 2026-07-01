import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, CreditCard, FolderOpen, Image, MessageCircle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getApplicationByParent } from '../../services/enrollmentService.js';
import { getFeeByApplication } from '../../services/feeService.js';
import { ENROLLMENT_STATUSES } from '../../constants/enrollmentStatuses.js';

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
  if (app?.status === ENROLLMENT_STATUSES.CORRECTION_REQUIRED) pendingActions.push({ label: 'Correction required on your application', to: '/parent/enrollment' });
  if (app?.status === ENROLLMENT_STATUSES.FEE_PENDING) pendingActions.push({ label: 'Fee payment pending', to: '/parent/fees' });
  if (fee?.status === 'payment_submitted') pendingActions.push({ label: 'Payment under verification', to: '/parent/fees' });

  return (
    <DashboardLayout>
      <PageHeader title="Parent Dashboard" subtitle={`Welcome back, ${user?.name}`} />

      {app ? (
        <>
          <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, var(--navy), #2d5282)', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <p style={{ margin: '0 0 4px', opacity: .8, fontSize: 13 }}>Enrollment Status</p>
                <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>{app.student?.fullName}</h2>
                <p style={{ margin: '0 0 12px', opacity: .8 }}>Application {app.applicationNo}</p>
                <StatusBadge status={app.status} />
              </div>
              <Link to="/parent/enrollment"><Button variant="secondary">View Details</Button></Link>
            </div>
          </div>

          {pendingActions.length > 0 && (
            <div className="card" style={{ marginBottom: 24, borderColor: 'var(--warning)' }}>
              <h3 className="card-title">Pending Actions</h3>
              {pendingActions.map((a) => (
                <div key={a.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 14 }}>{a.label}</span>
                  <Link to={a.to}><Button variant="primary" size="sm">Take Action</Button></Link>
                </div>
              ))}
            </div>
          )}

          <div className="stats-grid">
            <Link to="/parent/enrollment" className="stat-card" style={{ textDecoration: 'none' }}>
              <FileText size={22} className="stat-card-icon" />
              <div className="stat-card-label">Enrollment Status</div>
            </Link>
            <Link to="/parent/fees" className="stat-card" style={{ textDecoration: 'none' }}>
              <CreditCard size={22} className="stat-card-icon" />
              <div className="stat-card-label">{fee ? `₹${fee.total?.toLocaleString()} due` : 'Fees'}</div>
            </Link>
            <Link to="/parent/documents" className="stat-card" style={{ textDecoration: 'none' }}>
              <FolderOpen size={22} className="stat-card-icon" />
              <div className="stat-card-label">Documents</div>
            </Link>
            <Link to="/parent/photos" className="stat-card" style={{ textDecoration: 'none' }}>
              <Image size={22} className="stat-card-icon" />
              <div className="stat-card-label">Photos</div>
            </Link>
            <Link to="/parent/messages" className="stat-card" style={{ textDecoration: 'none' }}>
              <MessageCircle size={22} className="stat-card-icon" />
              <div className="stat-card-label">Messages</div>
            </Link>
          </div>
        </>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <h3 className="card-title">No Active Enrollment</h3>
          <p className="text-muted" style={{ marginBottom: 20 }}>You don&apos;t have an active enrollment application yet.</p>
          <Link to="/enroll"><Button variant="primary">Start Enrollment Application</Button></Link>
        </div>
      )}
    </DashboardLayout>
  );
}
