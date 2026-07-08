import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { ResponsiveDataTable } from '../../components/ui/DataTable.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { getTeacherStudents } from '../../services/teacherService.js';

const STUDENT_COLUMNS = [
  { key: 'name', label: 'Student Name', primary: true },
  {
    label: 'Class',
    render: (s) => s.classId?.replace('class-', '').toUpperCase() || '—',
  },
  { key: 'parentName', label: 'Parent Name' },
];

export default function TeacherStudents() {
  const { user } = useAuth();
  const { tenantPath } = useTenantPath();
  const [students, setStudents] = useState([]);

  useEffect(() => {
    if (!user?.id) return;
    getTeacherStudents(user.id).then(setStudents);
  }, [user?.id]);

  return (
    <DashboardLayout>
      <PageHeader title="Students" subtitle="View students in your assigned classes." />

      <ResponsiveDataTable
        columns={STUDENT_COLUMNS}
        data={students}
        minWidth={700}
        emptyMessage="No students assigned to your classes yet."
        renderActions={() => (
          <Link to={tenantPath('/teacher/messages')} className="table-action-btn table-action-btn-outline">
            Send Message
          </Link>
        )}
      />
    </DashboardLayout>
  );
}
