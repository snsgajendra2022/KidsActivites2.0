import { createContext, useContext, useMemo, useState } from 'react';
import { authenticate } from '../services/authService.js';
import { ROLE_DASHBOARD } from '../constants/roles.js';

const AuthContext = createContext(null);
const STORAGE_KEY = 'schoolbridge_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = async ({ identity, password }) => {
    const nextUser = authenticate(identity, password);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      isAuthenticated: Boolean(user),
      role: user?.role,
      dashboardPath: user ? ROLE_DASHBOARD[user.role] : '/login',
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
