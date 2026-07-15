import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_BASE_URL, resolveTenantSlug, TENANT_HEADER } from './api/config.js';
import { getAccessToken } from './api/tokenStorage.js';

function getChatSocketUrl() {
  const base = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  const tenantSlug = resolveTenantSlug();
  const query = tenantSlug ? `?${TENANT_HEADER}=${encodeURIComponent(tenantSlug)}` : '';
  return `${base}/api/v1/ws/chat${query}`;
}

function notificationTopic(userId) {
  const tenantSlug = resolveTenantSlug();
  return `/topic/tenant/${tenantSlug}/notifications/${userId}`;
}

let client = null;
let connectPromise = null;
let activeUserId = null;
const listeners = new Set();
let stompSub = null;

function canConnect() {
  return Boolean(API_BASE_URL && resolveTenantSlug() && getAccessToken());
}

function ensureClient() {
  if (!canConnect()) {
    return Promise.resolve(null);
  }

  if (client?.connected) {
    return Promise.resolve(client);
  }

  if (connectPromise) {
    return connectPromise;
  }

  const token = getAccessToken();
  const tenantSlug = resolveTenantSlug();
  client = new Client({
    webSocketFactory: () =>
      new SockJS(getChatSocketUrl(), null, {
        transports: ['xhr-streaming', 'xhr-polling'],
      }),
    connectHeaders: {
      Authorization: `Bearer ${token}`,
      ...(tenantSlug ? { [TENANT_HEADER]: tenantSlug } : {}),
    },
    reconnectDelay: 5000,
    onDisconnect: () => {
      connectPromise = null;
      stompSub = null;
    },
    onStompError: () => {
      connectPromise = null;
      stompSub = null;
    },
  });

  connectPromise = new Promise((resolve) => {
    client.onConnect = () => resolve(client);
    client.onWebSocketClose = () => {
      connectPromise = null;
      stompSub = null;
    };
    client.activate();
  });

  return connectPromise;
}

function dispatchEvent(payload) {
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch {
      // listener errors should not break other subscribers
    }
  });
}

function ensureSubscription(userId) {
  if (!userId) return;

  if (activeUserId && activeUserId !== userId) {
    stompSub?.unsubscribe();
    stompSub = null;
  }
  activeUserId = userId;

  if (stompSub) return;

  ensureClient().then((activeClient) => {
    if (!activeClient || stompSub || activeUserId !== userId) return;
    stompSub = activeClient.subscribe(notificationTopic(userId), (frame) => {
      try {
        const payload = JSON.parse(frame.body);
        dispatchEvent(payload);
      } catch {
        // ignore malformed frames
      }
    });
  });
}

/**
 * Subscribe to real-time notification events for the signed-in user.
 * Listener receives payloads: notification:new, notification:read, notifications:read-all.
 * Returns an unsubscribe function.
 */
export function subscribeToNotifications(userId, listener) {
  if (!userId || typeof listener !== 'function') {
    return () => {};
  }

  ensureSubscription(userId);
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stompSub?.unsubscribe();
      stompSub = null;
      activeUserId = null;
    }
  };
}

export function disconnectNotificationRealtime() {
  stompSub?.unsubscribe();
  stompSub = null;
  activeUserId = null;
  listeners.clear();
  connectPromise = null;
  if (client) {
    client.deactivate();
    client = null;
  }
}

export const NOTIFICATIONS_REFRESH_EVENT = 'notifications:refresh';

export function requestNotificationsRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT));
  }
}
