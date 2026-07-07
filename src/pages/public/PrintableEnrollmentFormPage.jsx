import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PrintableEnrollmentForm from '../../enrollment/printTemplate/PrintableEnrollmentForm.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { getApplication } from '../../services/enrollmentService.js';
import {
  getEmptyPrintFormData,
  mapApplicationToPrintForm,
} from '../../enrollment/printTemplate/enrollmentPrintFormData.js';
import { ROLES } from '../../constants/roles.js';
import NetworkBanner from '../../components/layout/NetworkBanner.jsx';

const ADMIN_ROLES = new Set([
  ROLES.SUPER_ADMIN,
  ROLES.SCHOOL_ADMIN,
  ROLES.ADMISSION_OFFICER,
  ROLES.ACCOUNTANT,
  ROLES.SUPPORT_STAFF,
]);

export default function PrintableEnrollmentFormPage() {
  const { portalName, school, activeSchoolId } = usePortalConfig();
  const { user } = useAuth();
  const { tenantPath } = useTenantPath();
  const [searchParams] = useSearchParams();
  const applicationId = searchParams.get('applicationId') || searchParams.get('id');
  const isAdmin = Boolean(user && ADMIN_ROLES.has(user.role));
  const schoolName = school?.name || portalName;

  const emptyForm = useMemo(() => getEmptyPrintFormData(), []);
  const [loadState, setLoadState] = useState(() => ({
    loading: Boolean(applicationId),
    initialData: applicationId ? null : emptyForm,
    resolvedAppId: applicationId,
    readOnly: false,
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
          });
          return;
        }
        const submitted = app.status && app.status !== 'draft';
        setLoadState({
          loading: false,
          initialData: mapApplicationToPrintForm(app),
          resolvedAppId: app.id,
          readOnly: submitted && !isAdmin,
        });
      } catch {
        if (!cancelled) {
          setLoadState({
            loading: false,
            initialData: emptyForm,
            resolvedAppId: applicationId,
            readOnly: false,
          });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [applicationId, isAdmin, emptyForm]);

  if (loadState.loading || !loadState.initialData) {
    return (
      <div className="printable-enrollment-loading">
        <NetworkBanner />
        <p>Loading enrollment form…</p>
      </div>
    );
  }

  return (
    <div className="printable-enrollment-page">
      <NetworkBanner />
      <div className="no-print printable-enrollment-back">
        <Link to={tenantPath('/enroll')} className="enrollment-back-link inline-flex items-center gap-1">
          <ArrowLeft size={14} />
          Back to Enrollment
        </Link>
      </div>
      <PrintableEnrollmentForm
        key={loadState.resolvedAppId || 'new-print-form'}
        initialData={loadState.initialData}
        readOnly={loadState.readOnly}
        isAdmin={isAdmin}
        schoolName={schoolName}
        applicationId={loadState.resolvedAppId}
        parentId={user?.role === ROLES.PARENT ? user.id : null}
        schoolId={activeSchoolId || user?.schoolId || null}
      />
    </div>
  );
}
