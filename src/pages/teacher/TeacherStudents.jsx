import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import {
  ResponsiveDataTable,
  TableActionButton,
} from '../../components/ui/DataTable.jsx';
import { CLASS_STUDENTS } from '../../data/mockPhotos.js';

const STUDENT_COLUMNS = [
  { key: 'name', label: 'Student Name', primary: true },
  {
    label: 'Class',
    render: (s) => s.classId.replace('class-', '').toUpperCase(),
  },
  { key: 'parentName', label: 'Parent Name' },
];

export default function TeacherStudents() {
  return (
    <DashboardLayout>
      <PageHeader title="Students" subtitle="View students in your assigned classes." />

      <ResponsiveDataTable
        columns={STUDENT_COLUMNS}
        data={CLASS_STUDENTS}
        minWidth={700}
        renderActions={() => (
          <TableActionButton variant="outline">Send Message</TableActionButton>
        )}
      />
    </DashboardLayout>
  );
}
