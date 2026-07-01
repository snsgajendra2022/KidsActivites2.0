import { createContext, useContext, useMemo, useState } from 'react';
import { authenticateByEmail, sendLoginOtp, sendEmailLoginOtp, verifyLoginOtp, verifyLoginOtpByChannel } from '../services/authService.js';
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

  const login = async ({ email, password }) => {
    const nextUser = authenticateByEmail(email, password);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  };

  const requestOtp = async (mobile) => sendLoginOtp(mobile);

  const requestEmailOtp = async (email) => sendEmailLoginOtp(email);

  const loginWithOtp = async ({ mobile, otp }) => {
    const nextUser = verifyLoginOtp(mobile, otp);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  };

  const loginWithEmailOtp = async ({ email, otp }) => {
    const nextUser = verifyLoginOtpByChannel('email', email, otp);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const updateProfile = (updates) => {
    if (!user) return null;
    const nextUser = { ...user, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  };

  const value = useMemo(
    () => ({
      user,
      login,
      requestOtp,
      requestEmailOtp,
      loginWithOtp,
      loginWithEmailOtp,
      logout,
      updateProfile,
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
