import { isTenantSubdomainHost, resolveTenantSlug } from '../../services/api/config.js';
import AccessLanding from '../../pages/public/AccessLanding.jsx';
import Login from '../../pages/auth/Login.jsx';
import TenantPathGate from './TenantPathGate.jsx';

/** Platform access landing on bare host; tenant login on subdomain (legacy). */
export default function PlatformLoginGate() {
  if (isTenantSubdomainHost() && resolveTenantSlug()) {
    return (
      <TenantPathGate>
        <Login />
      </TenantPathGate>
    );
  }
  return <AccessLanding />;
}
