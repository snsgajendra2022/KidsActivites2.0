import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { EmptyState } from '../../components/ui/index.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import {
  ResponsiveDataTable,
} from '../../components/ui/DataTable.jsx';
import { GraduationCap } from 'lucide-react';
import { getEnrolledStudents } from '../../services/enrollmentService.js';

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
];

export default function AdminStudents() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    getEnrolledStudents().then(setStudents);
  }, []);

  return (
    <DashboardLayout>
      <PageHeader title="Students" subtitle="Manage confirmed students and class assignments." />

      {students.length === 0 ? (
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
