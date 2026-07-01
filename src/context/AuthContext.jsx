import { createContext, useContext, useMemo, useState } from 'react';
import {
  loginByEmail,
  sendLoginOtp,
  sendEmailLoginOtp,
  verifyOtp,
  verifyOtpByChannel,
  logoutSession,
} from '../services/authService.js';
import { isDemoUser } from '../services/api/demoMode.js';
import { ROLE_DASHBOARD } from '../constants/roles.js';
import { updateUserProfile, changeUserPassword } from '../services/userService.js';

const AuthContext = createContext(null);
const STORAGE_KEY = 'schoolbridge_user';

function persistUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

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
    const nextUser = await loginByEmail(email, password);
    persistUser(nextUser);
    setUser(nextUser);
    return nextUser;
  };

  const requestOtp = async (mobile) => sendLoginOtp(mobile);

  const requestEmailOtp = async (email) => sendEmailLoginOtp(email);

  const loginWithOtp = async ({ mobile, otp }) => {
    const nextUser = await verifyOtp(mobile, otp);
    persistUser(nextUser);
    setUser(nextUser);
    return nextUser;
  };

  const loginWithEmailOtp = async ({ email, otp }) => {
    const nextUser = await verifyOtpByChannel('email', email, otp);
    persistUser(nextUser);
    setUser(nextUser);
    return nextUser;
  };

  const logout = () => {
    logoutSession();
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const updateProfile = async (updates) => {
    if (!user) return null;
    const nextUser = await updateUserProfile(user, updates);
    persistUser(nextUser);
    setUser(nextUser);
    return nextUser;
  };

  const changePassword = async ({ currentPassword, newPassword }) => {
    if (!user) throw new Error('Not authenticated');
    return changeUserPassword(user, { currentPassword, newPassword });
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
      changePassword,
      isAuthenticated: Boolean(user),
      isDemoSession: isDemoUser(user),
      role: user?.role,
      dashboardPath: user ? ROLE_DASHBOARD[user.role] : '/login',
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
