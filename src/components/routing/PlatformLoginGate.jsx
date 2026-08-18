import { Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { isTenantSubdomainHost, resolveTenantSlug } from '../../services/api/config.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import LoadingState from '../ui/LoadingState.jsx';
import TenantPathGate from './TenantPathGate.jsx';
import { authenticatedHomePath } from '../../utils/authRoutes.js';

const Login = lazy(() => import('../../pages/auth/Login.jsx'));

/**
 * Platform `/login`: guests only. Signed-in users go to their dashboard.
 * Tenant subdomain `/login`: same Login inside TenantPathGate.
 */
export default function PlatformLoginGate() {
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

  if (isTenantSubdomainHost() && resolveTenantSlug()) {
    return (
      <TenantPathGate>
        <Suspense fallback={<LoadingState message="Loading sign-in…" className="min-h-dvh grid place-items-center" />}>
          <Login />
        </Suspense>
      </TenantPathGate>
    );
  }
  return (
    <Suspense fallback={<LoadingState message="Loading sign-in…" className="min-h-dvh grid place-items-center" />}>
      <Login />
    </Suspense>
  );
}
