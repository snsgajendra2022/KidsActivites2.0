import { useAuth } from '../context/AuthContext.jsx';
import { hasPermission, PERMISSIONS } from '../constants/permissions.js';

export function usePermission(permission) {
  const { user } = useAuth();
  return hasPermission(user?.role, permission);
}

export function usePermissions() {
  const { user } = useAuth();
  return {
    can: (permission) => hasPermission(user?.role, permission),
    role: user?.role,
    PERMISSIONS,
  };
}
