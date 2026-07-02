import { useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { EmptyState } from '../../components/ui/index.jsx';
import { ResponsiveDataTable } from '../../components/ui/DataTable.jsx';
import Input from '../../components/ui/Input.jsx';
import { listUsers } from '../../services/userService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import '../../styles/admin-users.css';

const COLUMNS = [
  { key: 'name', label: 'Name', primary: true },
  { key: 'email', label: 'Email' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'roleLabel', label: 'Role' },
  { key: 'schoolName', label: 'School' },
];

export default function AdminUsers() {
  const { user } = useAuth();
  const { schools } = usePortalConfig();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listUsers({
      schoolId: schoolFilter || undefined,
      role: roleFilter || undefined,
      search,
    }, user)
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [user, schoolFilter, roleFilter, search]);

  const roleOptions = useMemo(() => {
    const roles = new Set(users.map((u) => u.role));
    return [...roles].sort();
  }, [users]);

  return (
    <AppLayout>
      <PageTransition>
        <PageHeader
          title="All Users"
          subtitle="Platform-wide user directory across all schools. Super admin only."
        />

        <div className="admin-users-filters">
          <Input
            placeholder="Search name, email, mobile…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-users-filters__search"
          />
          <select
            className="admin-users-filters__select"
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
          >
            <option value="">All schools</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            className="admin-users-filters__select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All roles</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-[#45474c]">Loading users…</p>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Users Found"
            description="Try adjusting your search or filters."
          />
        ) : (
          <ResponsiveDataTable
            columns={COLUMNS}
            data={users}
            minWidth={720}
            emptyMessage="No users match your filters."
          />
        )}
      </PageTransition>
    </AppLayout>
  );
}
