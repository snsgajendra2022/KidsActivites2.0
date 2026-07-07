import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import KidzeePrintableForm from './KidzeePrintableForm.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { ROLES } from '../../constants/roles.js';
import { KIDZEE_BRANDING } from './kidzeePrintFields.js';
import NetworkBanner from '../../components/layout/NetworkBanner.jsx';

const ADMIN_ROLES = new Set([
  ROLES.SUPER_ADMIN,
  ROLES.SCHOOL_ADMIN,
  ROLES.ADMISSION_OFFICER,
  ROLES.ACCOUNTANT,
  ROLES.SUPPORT_STAFF,
]);

export default function KidzeePrintableFormPage() {
  const { branding: portalBranding } = usePortalConfig();
  const { user } = useAuth();
  const { tenantPath } = useTenantPath();
  const isAdmin = Boolean(user && ADMIN_ROLES.has(user.role));

  const branding = {
    ...KIDZEE_BRANDING,
    logoUrl: portalBranding?.logoUrl || KIDZEE_BRANDING.logoUrl,
  };

  return (
    <div className="kidzee-print-page">
      <NetworkBanner />
      <div className="no-print kidzee-print-back">
        <Link to={tenantPath('/enroll')} className="enrollment-back-link inline-flex items-center gap-1">
          <ArrowLeft size={14} />
          Back to Enrollment
        </Link>
      </div>
      <KidzeePrintableForm branding={branding} isAdmin={isAdmin} />
    </div>
  );
}
