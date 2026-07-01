import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { DataTable } from '../../components/ui/DataTable.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getApplicationByParent } from '../../services/enrollmentService.js';

function docStatusKey(status) {
  if (status === 'verified') return 'documents_verified';
  if (status === 'rejected') return 'rejected';
  return 'documents_pending';
}

export default function ParentDocuments() {
  const { user } = useAuth();
  const [app, setApp] = useState(null);

  useEffect(() => { getApplicationByParent(user.id).then(setApp); }, [user.id]);

  return (
    <DashboardLayout>
      <PageHeader title="Uploaded Documents" subtitle="View status of your submitted documents." />

      {app?.documents ? (
        <DataTable minWidth={600}>
          <thead>
            <tr>
              <th>Document</th>
              <th>File</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(app.documents).map(([key, doc]) => (
              <tr key={key}>
                <td className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</td>
                <td>{doc?.name}</td>
                <td>
                  <StatusBadge status={docStatusKey(doc?.status)}>
                    {doc?.status || 'pending'}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ) : (
        <div className="sb-card p-6">
          <p className="text-sm text-[#45474c]">No documents uploaded yet.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
