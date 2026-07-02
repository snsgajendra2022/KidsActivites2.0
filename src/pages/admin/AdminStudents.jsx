import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { EmptyState } from '../../components/ui/index.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import {
  ResponsiveDataTable,
  TableActionLink,
} from '../../components/ui/DataTable.jsx';
import { GraduationCap } from 'lucide-react';
import { getEnrolledStudents } from '../../services/enrollmentService.js';
import { toast } from '../../context/ToastContext.jsx';

const COLUMNS = [
  { key: 'applicationNo', label: 'Application No.', primary: true },
  { key: 'name', label: 'Student Name' },
  {
    label: 'Class',
    render: (row) => row.classApplying?.toUpperCase() || '—',
  },
  { key: 'parentName', label: 'Parent Name' },
  {
    label: 'Status',
    badge: true,
    render: (row) => <StatusBadge status={row.status} />,
  },
  {
    label: 'Submitted',
    muted: true,
    render: (row) => (row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : '—'),
  },
  {
    label: '',
    render: (row) => (
      <TableActionLink to={`/admin/applications/${row.id}`}>View Application</TableActionLink>
    ),
  },
];

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getEnrolledStudents()
      .then((data) => {
        if (active) setStudents(data);
      })
      .catch((err) => {
        if (active) {
          toast.error(err.message || 'Failed to load students');
          setStudents([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <DashboardLayout>
      <PageHeader title="Students" subtitle="Manage confirmed students and class assignments." />

      {loading ? (
        <p className="text-sm text-slate-500">Loading students…</p>
      ) : students.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No Students Yet"
          description="Students will appear here after admission is confirmed and accounts are created."
        />
      ) : (
        <ResponsiveDataTable
          columns={COLUMNS}
          data={students}
          minWidth={800}
          emptyMessage="No enrolled students found."
        />
      )}
    </DashboardLayout>
  );
}
