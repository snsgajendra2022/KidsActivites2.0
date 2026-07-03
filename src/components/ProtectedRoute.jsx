import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTenantPath } from '../hooks/useTenantPath.js';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuth();
  const { loginPath, roleDashboard } = useTenantPath();

  if (!isAuthenticated) return <Navigate to={loginPath} replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleDashboard(user.role) || loginPath} replace />;
  }

  return children;
}
