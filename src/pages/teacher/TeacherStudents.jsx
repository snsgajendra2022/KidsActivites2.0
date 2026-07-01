import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import {
  DataTable,
  TableActionButton,
  TableActionCell,
} from '../../components/ui/DataTable.jsx';
import { CLASS_STUDENTS } from '../../data/mockPhotos.js';

export default function TeacherStudents() {
  return (
    <DashboardLayout>
      <PageHeader title="Students" subtitle="View students in your assigned classes." />

      <DataTable minWidth={700}>
        <thead>
          <tr>
            <th>Student Name</th>
            <th>Class</th>
            <th>Parent Name</th>
            <th className="!text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {CLASS_STUDENTS.map((s) => (
            <tr key={s.id}>
              <td className="font-medium">{s.name}</td>
              <td>{s.classId.replace('class-', '').toUpperCase()}</td>
              <td>{s.parentName}</td>
              <TableActionCell showDash={false}>
                <TableActionButton variant="outline">Send Message</TableActionButton>
              </TableActionCell>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </DashboardLayout>
  );
}
