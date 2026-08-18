import { lazy, Suspense } from 'react';
import { isTenantSubdomainHost, resolveTenantSlug } from '../../services/api/config.js';
import LoadingState from '../ui/LoadingState.jsx';
import TenantPathGate from './TenantPathGate.jsx';
import TenantHomeGate from './TenantHomeGate.jsx';

const AccessLanding = lazy(() => import('../../pages/public/AccessLanding.jsx'));

/** Platform marketing home on bare host; tenant school landing on subdomain (legacy). */
export default function PlatformHomeGate() {
  if (isTenantSubdomainHost() && resolveTenantSlug()) {
    return (
      <TenantPathGate>
        <TenantHomeGate />
      </TenantPathGate>
    );
  }
  return (
    <Suspense fallback={<LoadingState message="Loading…" className="min-h-dvh grid place-items-center" />}>
      <AccessLanding />
    </Suspense>
  );
}
