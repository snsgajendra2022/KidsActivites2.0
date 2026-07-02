import { AuthProvider, useAuth } from '../context/AuthContext.jsx';
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
      <PortalConfigBridge>
        {children}
      </PortalConfigBridge>
    </AuthProvider>
  );
}
