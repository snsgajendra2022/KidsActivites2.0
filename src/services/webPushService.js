import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { toast } from 'sonner';
import {
  firebaseConfig,
  firebaseVapidKey,
  isFirebaseApiKeyShapeValid,
  isFirebaseWebConfigured,
} from '../config/firebase.js';
import { resolveTenantSlug } from './api/config.js';
import { api } from './api/client.js';
import { resolveNotificationPath } from '../utils/notificationLinks.js';
import { claimNotificationDisplay } from '../utils/notificationDisplayDedupe.js';
import { requestNotificationsRefresh } from './notificationRealtime.js';

const DEVICE_ID_KEY = 'sb_web_push_device_id';
const TOKEN_KEY = 'sb_web_fcm_token';
const TOKEN_USER_KEY = 'sb_web_fcm_token_user';

let messagingInstance = null;
let foregroundUnsub = null;
let clickListenerBound = false;
let supportCache = null;

function maskToken(token) {
  if (!token || typeof token !== 'string') return '(none)';
  if (token.length <= 12) return '***';
  return `${token.slice(0, 6)}…${token.slice(-4)}`;
}

function logDev(...args) {
  if (import.meta.env.DEV) {
    console.info('[web-push]', ...args);
  }
}

/** Always log failures — production was silent and looked "healthy" with only Notification.permission. */
function warnPush(...args) {
  console.warn('[web-push]', ...args);
}

function warnDev(...args) {
  if (import.meta.env.DEV) {
    console.warn('[web-push]', ...args);
  }
}

/** True when this browser profile already stored an FCM token after a successful register. */
export function hasLocalWebPushToken() {
  try {
    return Boolean(localStorage.getItem(TOKEN_KEY));
  } catch {
    return false;
  }
}

function describePushError(err) {
  const message = err?.message || String(err || 'Unknown error');
  const code = err?.code || err?.name || '';
  if (/push service not available/i.test(message)) {
    return 'This browser cannot reach the Web Push service (common in some Chromium builds / locked-down environments). Use Chrome or Edge on desktop, or check that push/FCM is not blocked.';
  }
  if (/registration-token-not-registered|messaging\/registration-token-not-registered/i.test(message + code)) {
    return 'FCM rejected the token. Try Allow notifications again after clearing site data for this origin.';
  }
  if (/vapid|applicationServerKey|InvalidAccessError/i.test(message + code)) {
    return 'VAPID / Web Push key rejected. Confirm VITE_FIREBASE_VAPID_KEY matches Firebase Console → Cloud Messaging → Web Push certificates.';
  }
  return message;
}

/** Persistent per-browser-profile id (Chrome ≠ Safari storage). */
export function getOrCreateDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `web-${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * Detect browser for diagnostics (Edge before Chrome — Edge UA contains Chrome).
 * @returns {'Chrome'|'Safari'|'Edge'|'Firefox'|'Unknown'}
 */
export function detectBrowserName() {
  const ua = navigator.userAgent || '';
  if (/Edg\//.test(ua) || /EdgiOS\//.test(ua)) return 'Edge';
  if (/Firefox\//.test(ua) || /FxiOS\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua) && !/Chromium\//.test(ua) && !/Edg\//.test(ua)) return 'Chrome';
  // iOS Chrome uses CriOS; desktop Safari has Safari without Chrome/CriOS
  if (/CriOS\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua) && !/CriOS\//.test(ua) && !/Chromium\//.test(ua)) {
    return 'Safari';
  }
  return 'Unknown';
}

export function getNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function checkMessagingSupport() {
  if (supportCache !== null) return supportCache;
  if (typeof window === 'undefined') {
    supportCache = false;
    return false;
  }
  if (!window.isSecureContext) {
    supportCache = false;
    return false;
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window) || !('indexedDB' in window)) {
    supportCache = false;
    return false;
  }
  supportCache = await isSupported().catch(() => false);
  return supportCache;
}

/**
 * @returns {Promise<{
 *   ok: boolean,
 *   reason: string,
 *   message: string,
 *   browser?: string,
 *   permission?: string,
 * }>}
 */
export async function getWebPushStatus() {
  const browser = typeof navigator !== 'undefined' ? detectBrowserName() : 'Unknown';

  if (typeof window === 'undefined') {
    return { ok: false, reason: 'unsupported', message: 'Not running in a browser.', browser };
  }
  if (!window.isSecureContext) {
    return {
      ok: false,
      reason: 'insecure',
      browser,
      message:
        'Browser notifications need HTTPS or localhost. Open the portal at https://… or http://localhost — not a LAN IP like http://192.168.x.x.',
    };
  }
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return {
      ok: false,
      reason: 'unsupported',
      browser,
      message: 'This browser does not support web push notifications.',
    };
  }
  if (!isFirebaseWebConfigured()) {
    return {
      ok: false,
      reason: 'missing_config',
      browser,
      message:
        'Firebase web push is not fully configured. Set VITE_FIREBASE_* and VITE_FIREBASE_VAPID_KEY in .env, then restart Vite.',
    };
  }
  if (!isFirebaseApiKeyShapeValid()) {
    return {
      ok: false,
      reason: 'missing_config',
      browser,
      message:
        'VITE_FIREBASE_API_KEY does not look like a Firebase web API key (expected to start with AIza…). Check Firebase Console → Project settings → Your apps.',
    };
  }

  const supported = await checkMessagingSupport();
  if (!supported) {
    return {
      ok: false,
      reason: 'unsupported',
      browser,
      message: 'Firebase Messaging is not supported in this browser (or APIs are blocked).',
    };
  }

  const permission = Notification.permission;
  if (permission === 'denied') {
    return {
      ok: false,
      reason: 'denied',
      browser,
      permission,
      message:
        'Notifications are blocked for this site. Enable them in the browser address-bar / site settings (and macOS System Settings → Notifications for Safari), then try again.',
    };
  }
  if (permission === 'granted') {
    // Permission alone is not enough — login sync can fail silently (getToken / SW / push service).
    if (!hasLocalWebPushToken()) {
      return {
        ok: false,
        reason: 'needs_register',
        browser,
        permission,
        message:
          `Permission is granted for ${browser}, but this device is not registered for push yet. Click Retry to finish setup.`,
      };
    }
    return {
      ok: true,
      reason: 'granted',
      browser,
      permission,
      message: `Browser notifications are on for ${browser}. This profile keeps its own FCM device token.`,
    };
  }
  return {
    ok: false,
    reason: 'default',
    browser,
    permission,
    message: `Allow notifications for ${browser} so you get alerts when this tab is in the background.`,
  };
}

async function ensureFirebaseApp() {
  if (!isFirebaseWebConfigured() || !isFirebaseApiKeyShapeValid()) return null;
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  const supported = await checkMessagingSupport();
  if (!supported) return null;
  if (!messagingInstance) {
    messagingInstance = getMessaging();
  }
  return messagingInstance;
}

async function waitForServiceWorkerActive(reg, timeoutMs = 8000) {
  if (reg.active?.state === 'activated') return reg.active;
  const pending = reg.installing || reg.waiting;
  if (!pending) {
    await navigator.serviceWorker.ready;
    return reg.active || (await navigator.serviceWorker.ready).active || null;
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(reg.active || null);
    }, timeoutMs);
    pending.addEventListener('statechange', () => {
      if (pending.state === 'activated') {
        clearTimeout(timer);
        resolve(pending);
      }
    });
  });
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;

  // Prefer the dedicated FCM worker. Do not unregister other workers blindly.
  const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
    scope: '/',
  });
  await navigator.serviceWorker.ready;
  const target = await waitForServiceWorkerActive(reg);
  target?.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig });
  logDev('service worker ready', { scope: reg.scope, state: target?.state });
  return reg;
}

/**
 * Quiet sync after login — only when permission is already granted.
 * Always upserts the current browser device on the backend (multi-device safe).
 * Retries briefly — SW / push-service races are common right after login.
 */
export async function syncWebPushToken(user) {
  if (!user?.id) return null;
  const status = await getWebPushStatus();
  if (status.reason === 'missing_config' || status.reason === 'insecure' || status.reason === 'unsupported') {
    warnPush('sync skipped:', status.reason, status.message);
    return null;
  }
  if (getNotificationPermission() !== 'granted') {
    return null;
  }

  const delays = [0, 400, 1200];
  let lastErr = null;
  for (const delay of delays) {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    try {
      const token = await registerTokenWithBackend(user, { forceUpsert: true, throwOnError: true });
      if (token) return token;
    } catch (err) {
      lastErr = err;
      warnPush('sync attempt failed:', describePushError(err), err);
    }
  }
  if (lastErr) warnPush('sync gave up after retries:', describePushError(lastErr));
  return null;
}

/**
 * User-gesture entry: permission prompt + FCM token + backend device upsert.
 *
 * IMPORTANT: When permission is still `default`, call `Notification.requestPermission()`
 * before any other awaits. Browsers only show the Allow dialog from a fresh user gesture;
 * awaiting support/config checks first often suppresses the prompt (looks like "auto enable failed").
 */
export async function enableWebPushFromUserGesture(user) {
  if (!user?.id) {
    return { ok: false, reason: 'no_user', message: 'Sign in first, then enable notifications.' };
  }

  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return { ok: false, reason: 'unsupported', message: 'This browser does not support web push notifications.' };
  }
  if (!window.isSecureContext) {
    return {
      ok: false,
      reason: 'insecure',
      message:
        'Browser notifications need HTTPS or localhost. Open the portal at https://… or http://localhost — not a LAN IP like http://192.168.x.x.',
    };
  }

  try {
    // Keep this as the first await while permission is still default (gesture chain).
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission === 'denied') {
      return {
        ok: false,
        reason: 'denied',
        message:
          'You blocked notifications. Enable them in browser / OS site settings to continue.',
      };
    }
    if (permission !== 'granted') {
      return {
        ok: false,
        reason: 'default',
        message: 'Permission was not granted.',
      };
    }

    const status = await getWebPushStatus();
    logDev('enable status', {
      reason: status.reason,
      browser: status.browser,
      permission: status.permission,
      messagingSupported: await checkMessagingSupport(),
    });

    if (status.reason === 'missing_config' || status.reason === 'insecure' || status.reason === 'unsupported') {
      return { ok: false, reason: status.reason, message: status.message };
    }

    const token = await registerTokenWithBackend(user, { forceUpsert: true, throwOnError: true });
    if (!token) {
      return {
        ok: false,
        reason: 'token_failed',
        message: 'Permission granted, but FCM token registration failed. Check the console, VAPID key, and HTTPS/localhost.',
      };
    }
    return {
      ok: true,
      reason: 'granted',
      message: `Notifications enabled for ${detectBrowserName()}.`,
      token: maskToken(token),
      browser: detectBrowserName(),
      deviceId: getOrCreateDeviceId(),
    };
  } catch (err) {
    warnPush('enable failed', err);
    return {
      ok: false,
      reason: 'error',
      message: describePushError(err) || 'Failed to enable browser notifications.',
    };
  }
}

async function registerTokenWithBackend(user, { forceUpsert = false, throwOnError = false } = {}) {
  try {
    if (!firebaseVapidKey) {
      throw new Error('VITE_FIREBASE_VAPID_KEY is missing from the production build.');
    }

    const messaging = await ensureFirebaseApp();
    if (!messaging) {
      throw new Error('Firebase Messaging is unavailable in this browser.');
    }

    const swReg = await registerServiceWorker();
    if (!swReg) {
      throw new Error('Service worker registration failed for /firebase-messaging-sw.js.');
    }

    const token = await getToken(messaging, {
      vapidKey: firebaseVapidKey,
      serviceWorkerRegistration: swReg,
    });
    if (!token) {
      throw new Error('getToken returned empty — check VAPID key and Notification permission.');
    }

    bindForegroundListener();
    bindNotificationClick(user);

    const lastToken = localStorage.getItem(TOKEN_KEY);
    const lastUser = localStorage.getItem(TOKEN_USER_KEY);
    const sameSession = lastToken === token && lastUser === String(user.id);

    // Always upsert unless we just registered this exact token for this user
    // in this page session AND caller did not force — actually for multi-device
    // last_seen freshness we upsert every enable/login sync.
    const shouldPost = forceUpsert || !sameSession;
    if (shouldPost) {
      const workspaceId = resolveTenantSlug();
      const browser = detectBrowserName();
      const payload = {
        platform: 'web',
        provider: 'fcm',
        token,
        deviceId: getOrCreateDeviceId(),
        browser,
        permissionStatus: Notification.permission,
        appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
        workspaceId: workspaceId || undefined,
        deviceName: `${browser} · ${navigator.userAgent?.slice(0, 100) || 'web'}`,
        userAgent: navigator.userAgent?.slice(0, 400),
      };

      logDev('register-device', {
        platform: payload.platform,
        provider: payload.provider,
        browser: payload.browser,
        deviceId: payload.deviceId,
        token: maskToken(token),
      });

      await api.post('/notifications/register-device', payload);
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOKEN_USER_KEY, String(user.id));
    } else {
      logDev('token unchanged for user; skip register-device', maskToken(token));
    }

    return token;
  } catch (err) {
    warnPush('register failed:', describePushError(err), err);
    if (throwOnError) throw err;
    return null;
  }
}

/**
 * Logout: deactivate THIS browser device only (not Safari / mobile / other profiles).
 */
export async function unregisterWebPushToken() {
  try {
    const deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (deviceId) {
      logDev('unregister-device', deviceId);
      await api.post('/notifications/unregister-device', { deviceId }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_USER_KEY);
  } catch {
    // logout must continue
  }
  if (foregroundUnsub) {
    foregroundUnsub();
    foregroundUnsub = null;
  }
}

/**
 * Foreground FCM: refresh bell + in-app toast (deduped vs STOMP by notification id).
 * OS tray is for background/closed tabs (service worker).
 */
function bindForegroundListener() {
  if (foregroundUnsub || !messagingInstance) return;
  foregroundUnsub = onMessage(messagingInstance, (payload) => {
    requestNotificationsRefresh();
    const data = payload?.data || {};
    const notifId = data.notificationId || data.id || null;
    const title = payload?.notification?.title || data.title;
    const body = payload?.notification?.body || data.body || data.message || '';
    if (
      title
      && document.visibilityState === 'visible'
      && claimNotificationDisplay(notifId || `fcm-fg-${title}-${body}`)
    ) {
      toast(title, { description: body });
    }
    logDev('foreground message', {
      id: notifId,
      title,
      hasNotificationBlock: Boolean(payload?.notification),
    });
  });
}

function bindNotificationClick(user) {
  if (clickListenerBound || !('serviceWorker' in navigator)) return;
  clickListenerBound = true;
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== 'NOTIFICATION_CLICK') return;
    navigateFromPayload(event.data.data || {}, user?.role);
  });
}

/** Same-origin paths only — blocks open redirects. */
function sanitizeAppPath(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin === window.location.origin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // ignore
  }
  return null;
}

function navigateFromPayload(data, role) {
  const explicit = sanitizeAppPath(
    data.webRoute || data.url || data.link || data.actionUrl || data.route,
  );
  if (explicit) {
    logDev('click navigate', explicit);
    window.location.assign(explicit);
    return;
  }
  const path = resolveNotificationPath(
    {
      type: data.type,
      conversationId: data.conversationId || data.entityId,
      link: data.link,
      webRoute: data.webRoute,
      actionUrl: data.actionUrl,
      url: data.url,
    },
    role,
  );
  if (path) {
    const safe = sanitizeAppPath(path);
    if (!safe) return;
    const slug = resolveTenantSlug();
    const full = slug && !safe.startsWith(`/${slug}`) ? `/${slug}${safe}` : safe;
    logDev('click navigate resolved', full);
    window.location.assign(full);
  }
}
