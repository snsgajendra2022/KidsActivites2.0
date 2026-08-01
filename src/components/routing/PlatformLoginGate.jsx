import { isTenantSubdomainHost, resolveTenantSlug } from '../../services/api/config.js';
import Login from '../../pages/auth/Login.jsx';
import TenantPathGate from './TenantPathGate.jsx';

/**
 * Platform `/login`: email-first Login (no workspace slug step).
 * Tenant subdomain `/login`: same Login inside TenantPathGate.
 */
export default function PlatformLoginGate() {
  if (isTenantSubdomainHost() && resolveTenantSlug()) {
    return (
      <TenantPathGate>
        <Login />
      </TenantPathGate>
    );
  }
  return <Login />;
}
