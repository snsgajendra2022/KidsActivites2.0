import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { Link } from 'react-router-dom';
import { useTenantPath } from '../../hooks/useTenantPath.js';

const CHANNELS = [
  { name: 'Mobile Push', status: 'Live', detail: 'Firebase/web push for parent, teacher, and admin alerts.' },
  { name: 'In-app Chat', status: 'Live', detail: 'Teacher-parent direct messaging with attachments.' },
  { name: 'Notice Board / Circulars', status: 'Live', detail: 'School and class announcements with acknowledgements.' },
  { name: 'Email', status: 'Configured', detail: 'Delivery depends on backend mail provider settings.' },
  { name: 'SMS', status: 'Configured', detail: 'Attendance and fee reminders via SMS gateway.' },
  { name: 'WhatsApp', status: 'Ready', detail: 'Template-based WhatsApp Business integration hooks.' },
];

export default function CommunicationCenterPage() {
  const { tenantPath } = useTenantPath();

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="Communication System"
          subtitle="Replace WhatsApp dependency with school-owned channels."
        />
        <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CHANNELS.map((channel) => (
            <div key={channel.name} className="sb-card p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold text-[#0b1c30]">{channel.name}</h2>
                <span className="rounded-full bg-[#eef5ff] px-2.5 py-1 text-[11px] font-bold text-[#0058be]">
                  {channel.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-[#667085]">{channel.detail}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={tenantPath('/admin/notice-board')} className="sb-button-primary">Manage Notices</Link>
          <Link to={tenantPath('/admin/chat')} className="sb-button-secondary">Open Chat</Link>
          <Link to={tenantPath('/admin/notifications')} className="sb-button-secondary">Notifications</Link>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
