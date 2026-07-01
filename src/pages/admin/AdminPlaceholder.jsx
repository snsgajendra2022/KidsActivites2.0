import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';

export default function AdminPlaceholder({ title, subtitle }) {
  return (
    <DashboardLayout>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="card"><p className="text-muted">This module is ready for backend integration. See backend.md for API specifications.</p></div>
    </DashboardLayout>
  );
}
