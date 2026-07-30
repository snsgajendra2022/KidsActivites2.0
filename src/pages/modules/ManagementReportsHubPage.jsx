import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { Link } from 'react-router-dom';
import { useTenantPath } from '../../hooks/useTenantPath.js';

const REPORTS = [
  {
    group: 'Student',
    items: [
      { label: 'Enrollment growth', path: '/admin/reports' },
      { label: 'Attendance reports', path: '/admin/attendance' },
      { label: 'Exam performance / marks', path: '/admin/exam-marks' },
    ],
  },
  {
    group: 'Finance',
    items: [
      { label: 'Fee collection & pending', path: '/admin/reports' },
      { label: 'Advanced fee controls', path: '/admin/fees-advanced' },
      { label: 'Accounting dashboard', path: '/admin/accounting' },
    ],
  },
  {
    group: 'Teachers',
    items: [
      { label: 'Teacher roster & workload', path: '/admin/teachers' },
      { label: 'Staff attendance / HR', path: '/admin/hr' },
      { label: 'Timetable load', path: '/admin/timetable' },
    ],
  },
];

export default function ManagementReportsHubPage() {
  const { tenantPath } = useTenantPath();

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="Management Reports"
          subtitle="Student, finance, and teacher analytics in one place."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {REPORTS.map((section) => (
            <section key={section.group} className="sb-card p-5">
              <h2 className="mb-4 text-base font-bold text-[#0b1c30]">{section.group}</h2>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <Link
                    key={item.path + item.label}
                    to={tenantPath(item.path)}
                    className="block rounded-lg border border-[#e5e8ef] px-3 py-2 text-sm font-semibold text-[#0058be] hover:bg-[#f7f9fc]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
