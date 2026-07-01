import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { ResponsiveDataTable } from '../../components/ui/DataTable.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getApplicationByParent } from '../../services/enrollmentService.js';

function docStatusKey(status) {
  if (status === 'verified') return 'documents_verified';
  if (status === 'rejected') return 'rejected';
  return 'documents_pending';
}

function formatDocKey(key) {
  return key.replace(/([A-Z])/g, ' $1');
}

export default function ParentDocuments() {
  const { user } = useAuth();
  const [app, setApp] = useState(null);

  useEffect(() => { getApplicationByParent(user.id).then(setApp); }, [user.id]);

  const documents = app?.documents
    ? Object.entries(app.documents).map(([key, doc]) => ({ key, doc }))
    : [];

  const DOC_COLUMNS = [
    {
      label: 'Document',
      primary: true,
      render: (row) => <span className="capitalize">{formatDocKey(row.key)}</span>,
    },
    {
      label: 'File',
      render: (row) => row.doc?.name,
    },
    {
      label: 'Status',
      badge: true,
      render: (row) => (
        <StatusBadge status={docStatusKey(row.doc?.status)}>
          {row.doc?.status || 'pending'}
        </StatusBadge>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader title="Uploaded Documents" subtitle="View status of your submitted documents." />

      {documents.length > 0 ? (
        <ResponsiveDataTable
          columns={DOC_COLUMNS}
          data={documents}
          keyExtractor={(row) => row.key}
          minWidth={600}
        />
      ) : (
        <div className="sb-card p-6">
          <p className="text-sm text-[#45474c]">No documents uploaded yet.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
