/* eslint-disable no-undef */
/**
 * Firebase Cloud Messaging service worker.
 * Keep firebase-* versions in sync with the `firebase` package in package.json.
 *
 * Config is injected at runtime via postMessage from the app (see webPushService.js)
 * OR fall back to self.__FIREBASE_CONFIG__ set by a build step.
 */
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js');

let messaging = null;

function initFirebase(config) {
  if (!config || !config.apiKey || !config.projectId) return;
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const title =
        payload.notification?.title
        || payload.data?.title
        || 'Kids Activities';
      const body =
        payload.notification?.body
        || payload.data?.body
        || payload.data?.message
        || '';
      const options = {
        body,
        data: payload.data || {},
        icon: '/favicon.ico',
      };
      self.registration.showNotification(title, options);
    });
  } catch (err) {
    console.warn('[fcm-sw] init failed', err);
  }
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG' && event.data.config) {
    initFirebase(event.data.config);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const route = data.webRoute || data.link || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', data });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(typeof route === 'string' ? route : '/');
      }
      return undefined;
    }),
  );
});
