import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { resolveTenantSlug } from '../../services/api/config.js';
import KidsLandingPage from '../../pages/public/KidsLandingPage.jsx';
import LoadingState from '../ui/LoadingState.jsx';
import { authenticatedHomePath } from '../../utils/authRoutes.js';

/**
 * Platform `/`: marketing landing for guests only.
 * Signed-in users are sent to their role dashboard (cannot browse the front page
 * without logging out).
 */
export default function PlatformLandingGate() {
  const { isAuthenticated, user, bootstrapping } = useAuth();
  const { tenantSlug, schoolSlug } = useTenant();

  if (bootstrapping) {
    return <LoadingState message="Loading your session…" />;
  }

  if (isAuthenticated && user?.role) {
    return (
      <Navigate
        to={authenticatedHomePath(user, tenantSlug || schoolSlug || resolveTenantSlug())}
        replace
      />
    );
  }

  return <KidsLandingPage />;
}
