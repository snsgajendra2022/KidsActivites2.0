import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { EmptyState } from '../../components/ui/index.jsx';
import { GraduationCap } from 'lucide-react';

export default function AdminStudents() {
  return (
    <DashboardLayout>
      <PageHeader title="Students" subtitle="Manage confirmed students and class assignments." />
      <EmptyState icon={GraduationCap} title="No Students Yet" description="Students will appear here after admission is confirmed and accounts are created." />
    </DashboardLayout>
  );
}
