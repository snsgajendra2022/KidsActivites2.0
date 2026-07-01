import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getApplicationByParent } from '../../services/enrollmentService.js';

export default function ParentDocuments() {
  const { user } = useAuth();
  const [app, setApp] = useState(null);

  useEffect(() => { getApplicationByParent(user.id).then(setApp); }, [user.id]);

  return (
    <DashboardLayout>
      <PageHeader title="Uploaded Documents" subtitle="View status of your submitted documents." />

      {app?.documents ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Document</th><th>File</th><th>Status</th></tr></thead>
            <tbody>
              {Object.entries(app.documents).map(([key, doc]) => (
                <tr key={key}>
                  <td>{key.replace(/([A-Z])/g, ' $1')}</td>
                  <td>{doc?.name}</td>
                  <td><span className={`badge badge-${doc?.status === 'verified' ? 'approved' : doc?.status === 'rejected' ? 'rejected' : 'review'}`}>{doc?.status || 'pending'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card"><p className="text-muted">No documents uploaded yet.</p></div>
      )}
    </DashboardLayout>
  );
}
