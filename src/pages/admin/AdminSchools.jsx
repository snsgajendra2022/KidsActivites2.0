import { useCallback, useEffect, useState } from 'react';
import { Building2, Cloud, CloudOff, ExternalLink, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { listTenantsAdmin, retryTenantFileVault } from '../../services/tenantAdminService.js';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import '../../styles/admin-users.css';

const DEFAULT_STUDIO_CONSOLE = 'https://photostudio.mytiny.us';

function fileVaultTone(status) {
  const s = (status || '').toUpperCase();
  if (s === 'CONNECTED') return 'ok';
  if (s === 'FAILED') return 'bad';
  return 'warn';
}

function studioConsoleUrl(fv = {}) {
  return fv.studioConsoleUrl || fv.studioBaseUrl || DEFAULT_STUDIO_CONSOLE;
}

export default function AdminSchools() {
  const { activeSchoolId, switchSchool } = usePortalConfig();
  const { toast } = useToast();
  const { tenantPath } = useTenantPath();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingSlug, setRetryingSlug] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    listTenantsAdmin()
      .then(setTenants)
      .catch((err) => {
        toast(err?.message || 'Failed to load tenants', 'error');
        setTenants([]);
      })
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelect = async (schoolId) => {
    await switchSchool(schoolId);
    toast('School selected for portal branding.', 'success');
  };

  const openStudioCloud = (fv) => {
    const url = studioConsoleUrl(fv);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleRetryFileVault = async (slug) => {
    setRetryingSlug(slug);
    try {
      const updated = await retryTenantFileVault(slug);
      setTenants((prev) => prev.map((t) => (t.slug === slug ? updated : t)));
      const status = updated?.fileVault?.connectionStatus || 'UNKNOWN';
      const connected = status === 'CONNECTED';
      toast(
        connected
          ? `Backend Studio cloud connected for ${slug}. Use Open cloud to launch the studio console.`
          : `Cloud setup for ${slug}: ${status}${updated?.fileVault?.statusMessage ? ` — ${updated.fileVault.statusMessage}` : ''}`,
        connected ? 'success' : 'error',
      );
    } catch (err) {
      toast(err?.message || 'FileVault retry failed', 'error');
    } finally {
      setRetryingSlug(null);
    }
  };

  return (
    <AppLayout>
      <PageTransition>
        <PageHeader
          title="Schools & workspaces"
          subtitle="Platform view of every tenant: owner, status, and Backend Studio photo cloud. Retry cloud provisions S3 on Backend Studio; Open cloud launches the studio console."
        />

        {loading ? (
          <p className="text-sm text-[#45474c]">Loading tenants…</p>
        ) : tenants.length === 0 ? (
          <p className="text-sm text-[#45474c]">No tenants found.</p>
        ) : (
          <div className="admin-schools-grid">
            {tenants.map((tenant) => {
              const schoolId = tenant.schoolId || tenant.id;
              const fv = tenant.fileVault || {};
              const tone = fileVaultTone(fv.connectionStatus);
              const isActive = activeSchoolId === schoolId;
              return (
                <article
                  key={tenant.slug || schoolId}
                  className={`admin-school-card${isActive ? ' admin-school-card--active' : ''}`}
                >
                  <div className="admin-school-card__icon">
                    <Building2 size={24} />
                  </div>
                  <h2 className="admin-school-card__name">{tenant.name}</h2>
                  <p className="admin-school-card__meta">
                    {tenant.status || 'ACTIVE'}
                    {tenant.plan ? ` · ${tenant.plan}` : ''}
                  </p>
                  <p className="admin-school-card__address font-mono text-xs">/{tenant.slug}</p>
                  <p className="admin-school-card__contact">
                    {tenant.ownerEmail || 'No owner email'}
                    {tenant.ownerPhone ? ` · ${tenant.ownerPhone}` : ''}
                  </p>

                  <div className={`admin-tenant-cloud admin-tenant-cloud--${tone}`}>
                    {tone === 'ok' ? <Cloud size={14} /> : <CloudOff size={14} />}
                    <div>
                      <strong>Photo cloud</strong>
                      <span>
                        {fv.connectionStatus || 'NOT_PROVISIONED'}
                        {fv.username ? ` · ${fv.username}` : ''}
                      </span>
                      {fv.statusMessage ? (
                        <em title={fv.statusMessage}>{fv.statusMessage}</em>
                      ) : null}
                    </div>
                  </div>

                  <div className="admin-school-card__actions">
                    <Link
                      to={`/${tenant.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="premium-btn premium-btn-secondary premium-btn-sm"
                    >
                      <ExternalLink size={14} /> View site
                    </Link>
                    <button
                      type="button"
                      className="premium-btn premium-btn-secondary premium-btn-sm"
                      onClick={() => handleSelect(schoolId)}
                    >
                      {isActive ? 'Selected' : 'Select'}
                    </button>
                    <Link
                      to={tenantPath('/admin/portal-settings')}
                      className="premium-btn premium-btn-primary premium-btn-sm"
                      onClick={() => handleSelect(schoolId)}
                    >
                      Portal Branding
                    </Link>
                    <button
                      type="button"
                      className="premium-btn premium-btn-secondary premium-btn-sm"
                      onClick={() => openStudioCloud(fv)}
                      title={studioConsoleUrl(fv)}
                    >
                      <Cloud size={14} /> Open cloud
                    </button>
                    {tone !== 'ok' ? (
                      <button
                        type="button"
                        className="premium-btn premium-btn-secondary premium-btn-sm"
                        disabled={retryingSlug === tenant.slug}
                        onClick={() => handleRetryFileVault(tenant.slug)}
                      >
                        <RefreshCw size={14} className={retryingSlug === tenant.slug ? 'spin' : ''} />
                        {retryingSlug === tenant.slug ? 'Retrying…' : 'Retry cloud'}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </PageTransition>
    </AppLayout>
  );
}
