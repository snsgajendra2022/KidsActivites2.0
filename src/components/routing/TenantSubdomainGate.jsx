import { useTenant } from '../../context/TenantContext.jsx';
import InvalidWorkspace from '../../pages/public/InvalidWorkspace.jsx';

/** On tenant subdomain, block access when workspace does not exist. */
export default function TenantSubdomainGate({ children }) {
  const { isTenantSubdomain, school, schoolResolving } = useTenant();

  if (!isTenantSubdomain) {
    return children;
  }

  if (schoolResolving) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading workspace…
      </div>
    );
  }

  if (!school) {
    return <InvalidWorkspace />;
  }

  return children;
}
