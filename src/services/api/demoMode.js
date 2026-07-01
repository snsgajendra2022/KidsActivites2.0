import usersData from '../../data/users.json';
import { isApiEnabled, isForceMock } from './config.js';

const USER_STORAGE_KEY = 'schoolbridge_user';

const DEMO_MOBILES = new Set(
  usersData.users.map((u) => String(u.mobile).replace(/\D/g, '').slice(-10)),
);

/** Demo accounts use @schoolbridge.demo emails from users.json */
export function isDemoEmail(email) {
  return String(email || '').trim().toLowerCase().endsWith('@schoolbridge.demo');
}

export function isDemoMobile(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '');
  const normalized = digits.length === 12 && digits.startsWith('91')
    ? digits.slice(2)
    : digits.length === 11 && digits.startsWith('0')
      ? digits.slice(1)
      : digits;
  return DEMO_MOBILES.has(normalized);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** True when session should use local mock / dummy data. */
export function isDemoUser(user = getStoredUser()) {
  if (!user) return !isApiEnabled();
  if (user.isDemoSession === true) return true;
  if (user.isDemoSession === false) return false;
  return isDemoEmail(user.email) || isDemoMobile(user.mobile);
}

export function shouldUseMockData(user = getStoredUser()) {
  if (isForceMock()) return true;
  if (isDemoUser(user)) return true;
  if (!isApiEnabled()) return true;
  return false;
}

export function markDemoSession(user, isDemo) {
  return { ...user, isDemoSession: isDemo };
}
