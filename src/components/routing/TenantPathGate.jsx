import { useTenant } from '../../context/TenantContext.jsx';
import InvalidWorkspace from '../../pages/public/InvalidWorkspace.jsx';

/** On tenant path or subdomain, block access when workspace does not exist. */
export default function TenantPathGate({ children }) {
  const { isTenantRoute, isTenantSubdomain, school, schoolResolving } = useTenant();
  const gated = isTenantRoute || isTenantSubdomain;

  if (!gated) {
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
