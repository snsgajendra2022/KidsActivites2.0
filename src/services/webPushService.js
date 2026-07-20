import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { firebaseConfig, firebaseVapidKey, isFirebaseWebConfigured } from '../config/firebase.js';
import { resolveTenantSlug } from './api/config.js';
import { api } from './api/client.js';
import { resolveNotificationPath } from '../utils/notificationLinks.js';
import { requestNotificationsRefresh } from './notificationRealtime.js';

const DEVICE_ID_KEY = 'sb_web_push_device_id';
const TOKEN_KEY = 'sb_web_fcm_token';

let messagingInstance = null;
let foregroundUnsub = null;
let clickListenerBound = false;

function getOrCreateDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `web-${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

async function ensureFirebaseApp() {
  if (!isFirebaseWebConfigured()) return null;
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  if (!messagingInstance) {
    messagingInstance = getMessaging();
  }
  return messagingInstance;
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
    scope: '/',
  });
  const ready = await navigator.serviceWorker.ready;
  const target = ready.active || reg.active;
  target?.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig });
  return reg;
}

/**
 * Request permission, obtain FCM token, register with backend.
 * No-ops when Firebase/VAPID env vars are missing.
 */
export async function syncWebPushToken(user) {
  if (!user?.id || !isFirebaseWebConfigured()) return null;
  if (typeof Notification === 'undefined') return null;

  try {
    const messaging = await ensureFirebaseApp();
    if (!messaging) return null;

    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const swReg = await registerServiceWorker();
    const token = await getToken(messaging, {
      vapidKey: firebaseVapidKey,
      serviceWorkerRegistration: swReg || undefined,
    });
    if (!token) return null;

    bindForegroundListener();
    bindNotificationClick(user);

    const last = localStorage.getItem(TOKEN_KEY);
    if (last === token) {
      return token;
    }

    const workspaceId = resolveTenantSlug();
    // Web FCM registration tokens use provider `fcm` (same Admin SDK path as mobile).
    await api.post('/notifications/register-device', {
      platform: 'web',
      provider: 'fcm',
      token,
      deviceId: getOrCreateDeviceId(),
      appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
      workspaceId: workspaceId || undefined,
      deviceName: navigator.userAgent?.slice(0, 120),
    });

    localStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[web-push] sync failed', err);
    }
    return null;
  }
}

export async function unregisterWebPushToken() {
  try {
    const deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (deviceId) {
      await api.post('/notifications/unregister-device', { deviceId }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // logout must continue
  }
  if (foregroundUnsub) {
    foregroundUnsub();
    foregroundUnsub = null;
  }
}

/**
 * Foreground FCM: refresh bell only — no toast, no OS notification.
 * When the tab is focused, STOMP owns the single in-app toast (see useNotifications).
 * Background / other tab / closed: the service worker shows the OS notification.
 */
function bindForegroundListener() {
  if (foregroundUnsub || !messagingInstance) return;
  foregroundUnsub = onMessage(messagingInstance, () => {
    requestNotificationsRefresh();
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

function navigateFromPayload(data, role) {
  const webRoute = data.webRoute || data.link || data.actionUrl;
  if (typeof webRoute === 'string' && webRoute.startsWith('/')) {
    window.location.assign(webRoute);
    return;
  }
  const path = resolveNotificationPath(
    {
      type: data.type,
      conversationId: data.conversationId || data.entityId,
      link: data.link,
      webRoute: data.webRoute,
      actionUrl: data.actionUrl,
    },
    role,
  );
  if (path) {
    const slug = resolveTenantSlug();
    const full = slug && !path.startsWith(`/${slug}`) ? `/${slug}${path}` : path;
    window.location.assign(full);
  }
}
