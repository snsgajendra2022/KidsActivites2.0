import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { resolveTenantSlug } from '../../services/api/config.js';
import LoadingState from '../ui/LoadingState.jsx';
import { authenticatedHomePath } from '../../utils/authRoutes.js';

/**
 * Unknown URLs: signed-in users → dashboard; guests → platform landing.
 */
export default function CatchAllRedirect() {
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

  return <Navigate to="/" replace />;
}
