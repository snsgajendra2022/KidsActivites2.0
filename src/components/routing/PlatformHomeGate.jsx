import { isTenantSubdomainHost, resolveTenantSlug } from '../../services/api/config.js';
import AccessLanding from '../../pages/public/AccessLanding.jsx';
import Landing from '../../pages/public/Landing.jsx';
import TenantPathGate from './TenantPathGate.jsx';

/** Platform marketing home on bare host; tenant school landing on subdomain (legacy). */
export default function PlatformHomeGate() {
  if (isTenantSubdomainHost() && resolveTenantSlug()) {
    return (
      <TenantPathGate>
        <Landing />
      </TenantPathGate>
    );
  }
  return <AccessLanding />;
}
