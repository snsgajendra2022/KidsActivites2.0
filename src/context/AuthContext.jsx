import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  loginByEmail,
  sendLoginOtp,
  sendEmailLoginOtp,
  verifyOtp,
  verifyOtpByChannel,
  logoutSession,
  loginWithQrTokens,
} from '../services/authService.js';
import { isDemoUser } from '../services/api/demoMode.js';
import { clearMockStorage } from '../services/api/clearMockStorage.js';
import { getAccessToken } from '../services/api/tokenStorage.js';
import { isApiEnabled } from '../services/api/config.js';
import { getCurrentUser } from '../services/userService.js';
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
  const [bootstrapping, setBootstrapping] = useState(() => (
    Boolean(getAccessToken()) && isApiEnabled()
  ));

  useEffect(() => {
    if (!isApiEnabled()) {
      setBootstrapping(false);
      return;
    }

    clearMockStorage();

    if (!getAccessToken()) {
      setBootstrapping(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const profile = await getCurrentUser();
        if (!cancelled && profile) {
          persistUser({ ...profile, isDemoSession: false });
          setUser({ ...profile, isDemoSession: false });
        }
      } catch {
        if (!cancelled) {
          await logoutSession();
          localStorage.removeItem(STORAGE_KEY);
          setUser(null);
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const login = async ({ email, password }) => {
    const nextUser = await loginByEmail(email, password);
    if (isApiEnabled()) clearMockStorage();
    persistUser(nextUser);
    setUser(nextUser);
    return nextUser;
  };

  const requestOtp = async (mobile) => sendLoginOtp(mobile);

  const requestEmailOtp = async (email) => sendEmailLoginOtp(email);

  const loginWithOtp = async ({ mobile, otp }) => {
    const nextUser = await verifyOtp(mobile, otp);
    if (isApiEnabled()) clearMockStorage();
    persistUser(nextUser);
    setUser(nextUser);
    return nextUser;
  };

  const loginWithEmailOtp = async ({ email, otp }) => {
    const nextUser = await verifyOtpByChannel('email', email, otp);
    if (isApiEnabled()) clearMockStorage();
    persistUser(nextUser);
    setUser(nextUser);
    return nextUser;
  };

  const loginWithQr = async (tokenPayload) => {
    const nextUser = await loginWithQrTokens(tokenPayload);
    persistUser(nextUser);
    setUser(nextUser);
    return nextUser;
  };

  const logout = async () => {
    await logoutSession();
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
      bootstrapping,
      login,
      requestOtp,
      requestEmailOtp,
      loginWithOtp,
      loginWithEmailOtp,
      loginWithQr,
      logout,
      updateProfile,
      changePassword,
      isAuthenticated: Boolean(user),
      isDemoSession: isDemoUser(user),
      role: user?.role,
      dashboardPath: user ? ROLE_DASHBOARD[user.role] : '/login',
    }),
    [user, bootstrapping],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
