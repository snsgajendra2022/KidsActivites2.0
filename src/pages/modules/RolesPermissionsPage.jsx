import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { ROLE_LABELS, ROLES } from '../../constants/roles.js';

const EXTENDED_ROLES = [
  { key: ROLES.SUPER_ADMIN, label: ROLE_LABELS[ROLES.SUPER_ADMIN], scope: 'Platform' },
  { key: ROLES.SCHOOL_ADMIN, label: ROLE_LABELS[ROLES.SCHOOL_ADMIN], scope: 'School' },
  { key: 'principal', label: 'Principal', scope: 'School' },
  { key: ROLES.TEACHER, label: ROLE_LABELS[ROLES.TEACHER], scope: 'Assigned classes' },
  { key: ROLES.ACCOUNTANT, label: ROLE_LABELS[ROLES.ACCOUNTANT], scope: 'Fees & reports' },
  { key: 'receptionist', label: 'Receptionist', scope: 'Admissions desk' },
  { key: 'librarian', label: 'Librarian', scope: 'Library' },
  { key: 'transport_manager', label: 'Transport Manager', scope: 'Transport fleet' },
  { key: ROLES.DRIVER, label: ROLE_LABELS[ROLES.DRIVER], scope: 'Assigned vehicle / trip only' },
  { key: ROLES.PARENT, label: ROLE_LABELS[ROLES.PARENT], scope: 'Own children' },
  { key: ROLES.STUDENT, label: ROLE_LABELS[ROLES.STUDENT], scope: 'Self' },
  { key: ROLES.ADMISSION_OFFICER, label: ROLE_LABELS[ROLES.ADMISSION_OFFICER], scope: 'Admissions' },
  { key: ROLES.SUPPORT_STAFF, label: ROLE_LABELS[ROLES.SUPPORT_STAFF], scope: 'Support chat' },
];

const MATRIX = [
  ['Admissions', 'Full', 'Full', 'View', 'None', 'View', 'Create', 'None', 'None', 'None', 'Own', 'None', 'Edit', 'View'],
  ['Fees', 'Full', 'Full', 'View', 'None', 'Full', 'View', 'None', 'None', 'None', 'Own', 'None', 'View', 'None'],
  ['Attendance', 'Full', 'Full', 'Full', 'Assigned', 'None', 'None', 'None', 'Pickup', 'None', 'Own', 'Own', 'None', 'None'],
  ['Exams', 'Full', 'Full', 'Full', 'Assigned', 'None', 'None', 'None', 'None', 'None', 'Own', 'Own', 'None', 'None'],
  ['Library', 'Full', 'Full', 'View', 'None', 'None', 'None', 'Full', 'None', 'None', 'Own', 'Own', 'None', 'None'],
  ['Transport', 'Full', 'Full', 'View', 'None', 'None', 'None', 'None', 'Full', 'Assigned trip', 'Own child', 'None', 'None', 'None'],
  ['AI / Reports', 'Full', 'Full', 'Full', 'Limited', 'Finance', 'None', 'None', 'None', 'None', 'None', 'None', 'None', 'None'],
];

export default function RolesPermissionsPage() {
  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="Roles & Permissions"
          subtitle="Default school roles and access scopes for the School OS."
        />

        <section className="sb-card mb-5 p-5">
          <h2 className="mb-4 text-base font-bold text-[#0b1c30]">Role Catalog</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {EXTENDED_ROLES.map((role) => (
              <div key={role.key} className="rounded-xl border border-[#e5e8ef] bg-[#f8faff] p-4">
                <p className="font-bold text-[#0b1c30]">{role.label}</p>
                <p className="mt-1 text-xs text-[#667085]">Scope: {role.scope}</p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a93a3]">{role.key}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="sb-card overflow-x-auto p-5">
          <h2 className="mb-4 text-base font-bold text-[#0b1c30]">Permission Matrix (summary)</h2>
          <table className="min-w-[980px] w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#e5e8ef] text-[#667085]">
                <th className="px-2 py-2">Module</th>
                {EXTENDED_ROLES.map((role) => (
                  <th key={role.key} className="px-2 py-2">{role.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((row) => (
                <tr key={row[0]} className="border-b border-[#f0f2f6]">
                  {row.map((cell, index) => (
                    <td key={`${row[0]}-${index}`} className={`px-2 py-2 ${index === 0 ? 'font-semibold text-[#0b1c30]' : 'text-[#455168]'}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-[#667085]">
            Principal, Receptionist, Librarian, Transport Manager, and Bus Driver are product roles.
            Runtime auth includes `driver` in `constants/roles.js`. Teachers do not receive automatic fleet live access.
          </p>
        </section>
      </PageTransition>
    </DashboardLayout>
  );
}
