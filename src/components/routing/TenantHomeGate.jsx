import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import Landing from '../../pages/public/Landing.jsx';
import LoadingState from '../ui/LoadingState.jsx';

/**
 * Tenant root (/{slug}/): send signed-in users to their role dashboard;
 * otherwise show the public school landing page.
 */
export default function TenantHomeGate() {
  const { isAuthenticated, user, bootstrapping } = useAuth();
  const { roleDashboard } = useTenantPath();

  if (bootstrapping) {
    return <LoadingState message="Loading your session…" />;
  }

  if (isAuthenticated && user?.role) {
    const dashboard = roleDashboard(user.role);
    if (dashboard) return <Navigate to={dashboard} replace />;
  }

  return <Landing />;
}
