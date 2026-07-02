import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { listSchools } from '../../services/schoolService.js';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { Link } from 'react-router-dom';
import '../../styles/admin-users.css';

export default function AdminSchools() {
  const { activeSchoolId, switchSchool } = usePortalConfig();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSchools()
      .then(setSchools)
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (schoolId) => {
    await switchSchool(schoolId);
  };

  return (
    <AppLayout>
      <PageTransition>
        <PageHeader
          title="Schools"
          subtitle="All tenant schools on the platform. Select a school to manage its portal branding."
        />

        {loading ? (
          <p className="text-sm text-[#45474c]">Loading schools…</p>
        ) : (
          <div className="admin-schools-grid">
            {schools.map((school) => (
              <article
                key={school.id}
                className={`admin-school-card${activeSchoolId === school.id ? ' admin-school-card--active' : ''}`}
              >
                <div className="admin-school-card__icon">
                  <Building2 size={24} />
                </div>
                <h2 className="admin-school-card__name">{school.name}</h2>
                <p className="admin-school-card__meta">{school.academicYear}</p>
                <p className="admin-school-card__address">{school.address}</p>
                <p className="admin-school-card__contact">{school.email} · {school.phone}</p>
                <div className="admin-school-card__actions">
                  <button
                    type="button"
                    className="premium-btn premium-btn-secondary premium-btn-sm"
                    onClick={() => handleSelect(school.id)}
                  >
                    {activeSchoolId === school.id ? 'Selected' : 'Select School'}
                  </button>
                  <Link
                    to="/admin/portal-settings"
                    className="premium-btn premium-btn-primary premium-btn-sm"
                    onClick={() => handleSelect(school.id)}
                  >
                    Portal Branding
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </PageTransition>
    </AppLayout>
  );
}
