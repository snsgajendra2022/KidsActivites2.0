import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getApplicationByParent } from '../../services/enrollmentService.js';
import { STATUS_LABELS } from '../../constants/enrollmentStatuses.js';

export default function ParentEnrollmentStatus() {
  const { user } = useAuth();
  const [app, setApp] = useState(null);

  useEffect(() => { getApplicationByParent(user.id).then(setApp); }, [user.id]);

  return (
    <DashboardLayout>
      <PageHeader title="Enrollment Status" subtitle="Track your application progress and status history." />

      {app ? (
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 className="card-title">{app.student?.fullName}</h3>
                <p className="text-muted">Application {app.applicationNo} · Class {app.student?.classApplying?.toUpperCase()}</p>
              </div>
              <StatusBadge status={app.status} />
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Status History</h3>
            <div className="status-timeline">
              {(app.statusHistory || []).map((h, i) => (
                <div key={i} className="timeline-item done">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <h4>{STATUS_LABELS[h.status] || h.status}</h4>
                    <p>{h.note}</p>
                    <p>{new Date(h.date).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="card"><p className="text-muted">No enrollment application found.</p></div>
      )}
    </DashboardLayout>
  );
}
