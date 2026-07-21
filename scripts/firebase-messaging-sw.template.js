/* eslint-disable no-undef */
/**
 * Firebase Cloud Messaging service worker.
 * Keep firebase-* CDN versions in sync with the `firebase` package in package.json.
 *
 * Vite injects self.__FIREBASE_CONFIG__ at serve/build time (see vite.config.js).
 * The page may also postMessage FIREBASE_CONFIG as a fallback.
 */
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js');

let messaging = null;
let backgroundBound = false;

function hasValidConfig(config) {
  return Boolean(config && config.apiKey && config.projectId && config.messagingSenderId && config.appId);
}

function notificationTag(payload) {
  return (
    payload?.data?.notificationId
    || payload?.data?.id
    || payload?.data?.tag
    || undefined
  );
}

function buildNotificationOptions(payload) {
  const body =
    payload.notification?.body
    || payload.data?.body
    || payload.data?.message
    || '';
  const tag = notificationTag(payload);
  const data = { ...(payload.data || {}) };
  if (payload.notification?.title && !data.title) data.title = payload.notification.title;
  if (body && !data.body) data.body = body;

  // Normalize destination keys for notificationclick
  const route =
    data.webRoute
    || data.url
    || data.link
    || data.actionUrl
    || data.route
    || '';
  if (route && !data.webRoute) data.webRoute = route;

  return {
    body,
    data,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: tag || undefined,
    renotify: Boolean(tag),
  };
}

/**
 * Same-origin routes only (open-redirect safe).
 * Relative paths stay relative; absolute URLs must match this origin.
 */
function resolveSafeRoute(data) {
  const raw = data?.webRoute || data?.url || data?.link || data?.actionUrl || data?.route || '/';
  if (typeof raw !== 'string' || !raw) return '/';
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  try {
    const url = new URL(raw, self.location.origin);
    if (url.origin === self.location.origin) {
      return `${url.pathname}${url.search}${url.hash}` || '/';
    }
  } catch {
    // ignore
  }
  return '/';
}

function initFirebase(config) {
  if (!hasValidConfig(config)) return;
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    if (!messaging) {
      messaging = firebase.messaging();
    }
    if (!backgroundBound) {
      backgroundBound = true;
      messaging.onBackgroundMessage((payload) => {
        // When the push already includes a `notification` block, the browser
        // displays it. Calling showNotification again causes duplicates.
        if (payload?.notification?.title || payload?.notification?.body) {
          return;
        }
        const title =
          payload.data?.title
          || 'Kids Activities';
        const options = buildNotificationOptions(payload);
        return self.registration.showNotification(title, options);
      });
    }
  } catch (err) {
    console.warn('[fcm-sw] init failed', err);
  }
}

if (typeof self.__FIREBASE_CONFIG__ !== 'undefined') {
  initFirebase(self.__FIREBASE_CONFIG__);
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG' && event.data.config) {
    initFirebase(event.data.config);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const route = resolveSafeRoute(data);
  const absoluteUrl = new URL(route, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const sameOrigin = windowClients.filter((client) => {
        try {
          return new URL(client.url).origin === self.location.origin;
        } catch {
          return false;
        }
      });

      const focusAndNavigate = (client) => {
        client.postMessage({ type: 'NOTIFICATION_CLICK', data: { ...data, webRoute: route } });
        return client.focus().then((focused) => {
          const target = focused || client;
          if (target && route.startsWith('/') && 'navigate' in target) {
            try {
              return target.navigate(route);
            } catch {
              return target;
            }
          }
          return target;
        });
      };

      if (sameOrigin.length > 0) {
        return focusAndNavigate(sameOrigin[0]);
      }
      if (clients.openWindow) {
        return clients.openWindow(absoluteUrl);
      }
      return undefined;
    }),
  );
});
