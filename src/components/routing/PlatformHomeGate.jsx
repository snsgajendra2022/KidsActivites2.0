import { isTenantSubdomainHost, resolveTenantSlug } from '../../services/api/config.js';
import AccessLanding from '../../pages/public/AccessLanding.jsx';
import Landing from '../../pages/public/Landing.jsx';
import TenantSubdomainGate from './TenantSubdomainGate.jsx';

/** Platform marketing home on bare host; tenant school landing on subdomain. */
export default function PlatformHomeGate() {
  if (isTenantSubdomainHost() && resolveTenantSlug()) {
    return (
      <TenantSubdomainGate>
        <Landing />
      </TenantSubdomainGate>
    );
  }
  return <AccessLanding />;
}
