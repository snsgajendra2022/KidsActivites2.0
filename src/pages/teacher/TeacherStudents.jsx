import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { CLASS_STUDENTS } from '../../data/mockPhotos.js';

export default function TeacherStudents() {
  return (
    <DashboardLayout>
      <PageHeader title="Students" subtitle="View students in your assigned classes." />
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>Student Name</th><th>Class</th><th>Parent Name</th><th>Action</th></tr></thead>
          <tbody>
            {CLASS_STUDENTS.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.classId.replace('class-', '').toUpperCase()}</td>
                <td>{s.parentName}</td>
                <td><button className="btn btn-outline btn-sm">Send Message</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
