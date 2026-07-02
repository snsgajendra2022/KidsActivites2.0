import { useEffect, useState } from 'react';
import { Building2, ExternalLink } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { listSchoolsAdmin } from '../../services/schoolService.js';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Link } from 'react-router-dom';
import '../../styles/admin-users.css';

export default function AdminSchools() {
  const { activeSchoolId, switchSchool } = usePortalConfig();
  const { toast } = useToast();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSchoolsAdmin()
      .then(setSchools)
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (schoolId) => {
    await switchSchool(schoolId);
    toast('School selected for portal branding.', 'success');
  };

  return (
    <AppLayout>
      <PageTransition>
        <PageHeader
          title="Schools"
          subtitle="Each school has its own public URL. Select a school, then open Portal Branding. Main portal (/) is configured under Portal Branding → Main Portal."
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
                <p className="admin-school-card__address font-mono text-xs">/{school.slug}</p>
                <p className="admin-school-card__contact">{school.email} · {school.phone}</p>
                <div className="admin-school-card__actions">
                  <Link
                    to={`/${school.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="premium-btn premium-btn-secondary premium-btn-sm"
                  >
                    <ExternalLink size={14} /> View site
                  </Link>
                  <button
                    type="button"
                    className="premium-btn premium-btn-secondary premium-btn-sm"
                    onClick={() => handleSelect(school.id)}
                  >
                    {activeSchoolId === school.id ? 'Selected' : 'Select'}
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
