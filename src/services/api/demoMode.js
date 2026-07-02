import { isApiEnabled, isForceMock } from './config.js';

const USER_STORAGE_KEY = 'schoolbridge_user';

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** True when the app is in explicit mock/offline mode (not live API). */
export function isDemoUser(user = getStoredUser()) {
  if (isForceMock()) return true;
  if (!isApiEnabled()) return true;
  return user?.isDemoSession === true;
}

/** Route data requests to mock implementations only when API is unavailable or forced. */
export function shouldUseMockData() {
  if (isForceMock()) return true;
  return !isApiEnabled();
}

export function markDemoSession(user, isDemo) {
  return { ...user, isDemoSession: isDemo };
}
