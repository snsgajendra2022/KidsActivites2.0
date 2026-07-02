import { useEffect, useState } from 'react';
import { Building2, ExternalLink, Globe, Save } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Input from '../../components/ui/Input.jsx';
import { listSchoolsAdmin } from '../../services/schoolService.js';
import { getPlatformConfig, savePlatformConfig } from '../../services/platformConfigService.js';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Link } from 'react-router-dom';
import '../../styles/admin-users.css';

export default function AdminSchools() {
  const { activeSchoolId, switchSchool } = usePortalConfig();
  const { toast } = useToast();
  const [schools, setSchools] = useState([]);
  const [platform, setPlatform] = useState({ platformName: '', tagline: '' });
  const [loading, setLoading] = useState(true);
  const [savingPlatform, setSavingPlatform] = useState(false);

  useEffect(() => {
    Promise.all([listSchoolsAdmin(), getPlatformConfig()])
      .then(([schoolList, platformConfig]) => {
        setSchools(schoolList);
        setPlatform({
          platformName: platformConfig?.platformName || 'SchoolBridge',
          tagline: platformConfig?.tagline || '',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (schoolId) => {
    await switchSchool(schoolId);
    toast('School selected for portal branding.', 'success');
  };

  const handleSavePlatform = async () => {
    setSavingPlatform(true);
    try {
      const next = await savePlatformConfig({
        platformName: platform.platformName.trim() || 'SchoolBridge',
        tagline: platform.tagline.trim(),
      });
      setPlatform({
        platformName: next.platformName,
        tagline: next.tagline || '',
      });
      toast('Main portal settings saved. Updates appear on the homepage (/).', 'success');
    } catch {
      toast('Could not save main portal settings.', 'error');
    } finally {
      setSavingPlatform(false);
    }
  };

  return (
    <AppLayout>
      <PageTransition>
        <PageHeader
          title="Schools"
          subtitle="Manage the main portal (/) and each school's public URL. Select a school before opening Portal Branding."
        />

        <section className="sb-card mb-8 max-w-3xl p-6">
          <div className="mb-4 flex items-center gap-2">
            <Globe size={18} className="text-brand" />
            <h2 className="font-display text-base font-bold text-brand">Main Portal</h2>
          </div>
          <p className="mb-4 text-sm text-muted">
            Branding for the platform homepage at <strong>/</strong> — where parents choose a school.
          </p>
          <div className="grid gap-4">
            <Input
              label="Platform Name"
              value={platform.platformName}
              onChange={(e) => setPlatform((p) => ({ ...p, platformName: e.target.value }))}
              variant="enrollment"
              helper="Shown on the main homepage header (e.g. SchoolBridge)."
            />
            <Input
              label="Platform Tagline"
              value={platform.tagline}
              onChange={(e) => setPlatform((p) => ({ ...p, tagline: e.target.value }))}
              variant="enrollment"
              helper="Short description under the platform name on /."
            />
            <div>
              <button
                type="button"
                onClick={handleSavePlatform}
                disabled={savingPlatform}
                className="premium-btn premium-btn-primary premium-btn-sm"
              >
                <Save size={14} />
                {savingPlatform ? 'Saving…' : 'Save Main Portal'}
              </button>
            </div>
          </div>
        </section>

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
