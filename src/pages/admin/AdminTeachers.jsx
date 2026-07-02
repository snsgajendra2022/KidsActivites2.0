import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { EmptyState } from '../../components/ui/index.jsx';
import { ResponsiveDataTable } from '../../components/ui/DataTable.jsx';
import { listTeachers } from '../../services/userService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { ROLES } from '../../constants/roles.js';
import '../../styles/admin-users.css';

const COLUMNS = [
  { key: 'name', label: 'Teacher Name', primary: true },
  { key: 'email', label: 'Email' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'schoolName', label: 'School' },
];

export default function AdminTeachers() {
  const { user } = useAuth();
  const { activeSchoolId, school, isPlatformAdmin } = usePortalConfig();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  const schoolId = user?.role === ROLES.SUPER_ADMIN
    ? activeSchoolId
    : (user?.schoolId || activeSchoolId);

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    listTeachers(schoolId, user)
      .then(setTeachers)
      .finally(() => setLoading(false));
  }, [user, schoolId]);

  return (
    <AppLayout>
      <PageTransition>
        <PageHeader
          title="Teachers"
          subtitle={
            isPlatformAdmin
              ? `Teachers for ${school?.name || 'selected school'}. Switch school in Portal Branding.`
              : `All teachers registered at ${school?.name || 'your school'}.`
          }
        />

        {loading ? (
          <p className="text-sm text-[#45474c]">Loading teachers…</p>
        ) : teachers.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No Teachers Yet"
            description="Teacher accounts will appear here once they are added to this school."
          />
        ) : (
          <ResponsiveDataTable
            columns={COLUMNS}
            data={teachers}
            minWidth={640}
            emptyMessage="No teachers found for this school."
          />
        )}
      </PageTransition>
    </AppLayout>
  );
}
