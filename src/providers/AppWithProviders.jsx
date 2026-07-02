import { AuthProvider, useAuth } from '../context/AuthContext.jsx';
import { TenantProvider } from '../context/TenantContext.jsx';
import { PortalConfigProvider } from '../context/PortalConfigContext.jsx';

function PortalConfigBridge({ children }) {
  const { user } = useAuth();
  return (
    <PortalConfigProvider user={user}>
      {children}
    </PortalConfigProvider>
  );
}

export function AppWithProviders({ children }) {
  return (
    <AuthProvider>
      <TenantProvider>
        <PortalConfigBridge>
          {children}
        </PortalConfigBridge>
      </TenantProvider>
    </AuthProvider>
  );
}
