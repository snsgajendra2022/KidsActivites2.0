import { isTenantSubdomainHost, resolveTenantSlug } from '../../services/api/config.js';
import AccessLanding from '../../pages/public/AccessLanding.jsx';
import Login from '../../pages/auth/Login.jsx';

/** Platform access landing on bare host; tenant login on subdomain. */
export default function PlatformLoginGate() {
  if (isTenantSubdomainHost() && resolveTenantSlug()) {
    return <Login />;
  }
  return <AccessLanding />;
}
