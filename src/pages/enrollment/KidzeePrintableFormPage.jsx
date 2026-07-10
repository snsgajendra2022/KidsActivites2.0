import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import KidzeePrintableForm from './KidzeePrintableForm.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { ROLES } from '../../constants/roles.js';
import { getApplication } from '../../services/enrollmentService.js';
import {
  KIDZEE_BRANDING,
  getEmptyKidzeeFormData,
  mapApplicationToKidzeeForm,
} from './kidzeePrintFields.js';
import NetworkBanner from '../../components/layout/NetworkBanner.jsx';

const ADMIN_ROLES = new Set([
  ROLES.SUPER_ADMIN,
  ROLES.SCHOOL_ADMIN,
  ROLES.ADMISSION_OFFICER,
  ROLES.ACCOUNTANT,
  ROLES.SUPPORT_STAFF,
]);

export default function KidzeePrintableFormPage() {
  const { branding: portalBranding, activeSchoolId } = usePortalConfig();
  const { user } = useAuth();
  const { tenantPath } = useTenantPath();
  const [searchParams] = useSearchParams();
  const applicationId = searchParams.get('applicationId') || searchParams.get('id');
  const isAdmin = Boolean(user && ADMIN_ROLES.has(user.role));

  const backTarget = useMemo(() => {
    if (applicationId && isAdmin) {
      return {
        href: tenantPath(`/admin/applications/${applicationId}`),
        label: 'Back to Application',
      };
    }
    if (user?.role === ROLES.PARENT || user?.role === ROLES.STUDENT) {
      return {
        href: tenantPath('/parent/enrollment'),
        label: 'Back to Enrollment',
      };
    }
    if (isAdmin) {
      return {
        href: tenantPath('/admin/applications'),
        label: 'Back to Applications',
      };
    }
    return {
      href: tenantPath('/'),
      label: 'Back',
    };
  }, [applicationId, isAdmin, user?.role, tenantPath]);

  const branding = useMemo(() => ({
    ...KIDZEE_BRANDING,
    logoUrl: portalBranding?.logoUrl || KIDZEE_BRANDING.logoUrl,
  }), [portalBranding?.logoUrl]);

  const emptyForm = useMemo(() => getEmptyKidzeeFormData(branding), [branding]);
  const [loadState, setLoadState] = useState(() => ({
    loading: Boolean(applicationId),
    initialData: applicationId ? null : emptyForm,
    resolvedAppId: applicationId,
    readOnly: false,
    loadError: null,
  }));

  useEffect(() => {
    if (!applicationId) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const app = await getApplication(applicationId);
        if (cancelled) return;
        if (!app) {
          setLoadState({
            loading: false,
            initialData: emptyForm,
            resolvedAppId: applicationId,
            readOnly: false,
            loadError: 'Application not found. Sign in as an admin or save a new draft.',
          });
          return;
        }
        const submitted = app.status && app.status !== 'draft';
        setLoadState({
          loading: false,
          initialData: mapApplicationToKidzeeForm(app, branding),
          resolvedAppId: app.id,
          readOnly: submitted && !isAdmin,
          loadError: null,
        });
      } catch {
        if (!cancelled) {
          setLoadState({
            loading: false,
            initialData: emptyForm,
            resolvedAppId: applicationId,
            readOnly: false,
            loadError: 'Could not load this application. Sign in as an admin to view saved signatures.',
          });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [applicationId, isAdmin, emptyForm, branding]);

  if (loadState.loading || !loadState.initialData) {
    return (
      <div className="kidzee-print-page">
        <NetworkBanner />
        <p className="no-print" style={{ padding: '2rem', textAlign: 'center' }}>Loading enrollment form…</p>
      </div>
    );
  }

  return (
    <div className="kidzee-print-page">
      <NetworkBanner />
      {loadState.loadError && (
        <p className="no-print" style={{ padding: '0 1rem 1rem', color: '#b45309' }}>
          {loadState.loadError}
        </p>
      )}
      <KidzeePrintableForm
        key={loadState.resolvedAppId || 'new-kidzee-form'}
        initialData={loadState.initialData}
        readOnly={loadState.readOnly}
        isAdmin={isAdmin}
        branding={branding}
        applicationId={loadState.resolvedAppId}
        parentId={user?.role === ROLES.PARENT ? user.id : null}
        schoolId={activeSchoolId || user?.schoolId || null}
        backHref={backTarget.href}
        backLabel={backTarget.label}
      />
    </div>
  );
}
