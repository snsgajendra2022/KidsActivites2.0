import { Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import LoadingState from '../ui/LoadingState.jsx';
import { authenticatedHomePath } from '../../utils/authRoutes.js';

const Landing = lazy(() => import('../../pages/public/Landing.jsx'));

/**
 * Tenant root (/{slug}/): send signed-in users to their role dashboard;
 * otherwise show the public school landing page.
 */
export default function TenantHomeGate() {
  const { isAuthenticated, user, bootstrapping } = useAuth();
  const { tenantSlug, schoolSlug } = useTenant();

  if (bootstrapping) {
    return <LoadingState message="Loading your session…" />;
  }

  if (isAuthenticated && user?.role) {
    return (
      <Navigate
        to={authenticatedHomePath(user, tenantSlug || schoolSlug)}
        replace
      />
    );
  }

  return (
    <Suspense fallback={<LoadingState message="Loading…" className="min-h-dvh grid place-items-center" />}>
      <Landing />
    </Suspense>
  );
}
