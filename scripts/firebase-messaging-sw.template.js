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
  return {
    body,
    data,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: tag || undefined,
    renotify: Boolean(tag),
  };
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
  let route = data.webRoute || data.link || data.actionUrl || '/';
  if (typeof route !== 'string' || !route) route = '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', data });
          return client.focus().then((focused) => {
            if (focused && route.startsWith('/') && 'navigate' in focused) {
              try {
                return focused.navigate(route);
              } catch {
                return focused;
              }
            }
            return focused;
          });
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(route.startsWith('http') ? route : route);
      }
      return undefined;
    }),
  );
});
