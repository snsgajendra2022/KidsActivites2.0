import { clearTokens } from './tokenStorage.js';
import { resolveTenantSlug } from './config.js';
import { schoolLoginPath } from '../../utils/tenantUtils.js';

export const USER_STORAGE_KEY = 'kidsactivites_user';
export const AUTH_SESSION_CLEARED_EVENT = 'kidsactivites:session-cleared';

let redirectingToLogin = false;

/** Remove all client auth state (tokens + cached user profile). */
export function clearLocalAuthSession() {
  clearTokens();
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_SESSION_CLEARED_EVENT));
  }
}

/** Redirect to login once — avoids multiple parallel uploads each triggering navigation. */
export function redirectToLoginOnce() {
  if (typeof window === 'undefined') return;
  if (redirectingToLogin) return;
  if (window.location.pathname.includes('/login')) return;

  redirectingToLogin = true;
  clearLocalAuthSession();
  window.location.assign(schoolLoginPath(resolveTenantSlug()));
}

export function resetLoginRedirectGuard() {
  redirectingToLogin = false;
}
