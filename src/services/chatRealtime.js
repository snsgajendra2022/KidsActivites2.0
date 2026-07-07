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

let client = null;
let connectPromise = null;
const conversationSubscriptions = new Map();

function canConnect() {
  return Boolean(API_BASE_URL && resolveTenantSlug() && getAccessToken());
}

function conversationTopic(conversationId) {
  const tenantSlug = resolveTenantSlug();
  return `/topic/tenant/${tenantSlug}/conversation/${conversationId}`;
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
    webSocketFactory: () => new SockJS(getChatSocketUrl()),
    connectHeaders: {
      Authorization: `Bearer ${token}`,
      ...(tenantSlug ? { [TENANT_HEADER]: tenantSlug } : {}),
    },
    reconnectDelay: 5000,
    onDisconnect: () => {
      connectPromise = null;
    },
    onStompError: () => {
      connectPromise = null;
    },
  });

  connectPromise = new Promise((resolve) => {
    client.onConnect = () => resolve(client);
    client.onWebSocketClose = () => {
      connectPromise = null;
    };
    client.activate();
  });

  return connectPromise;
}

function dispatchEvent(conversationId, payload) {
  const entry = conversationSubscriptions.get(conversationId);
  if (!entry) return;
  entry.listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch {
      // listener errors should not break other subscribers
    }
  });
}

function ensureConversationSubscription(conversationId) {
  if (conversationSubscriptions.has(conversationId)) {
    return;
  }

  const listeners = new Set();
  conversationSubscriptions.set(conversationId, { stompSub: null, listeners });

  ensureClient().then((activeClient) => {
    if (!activeClient) return;

    const entry = conversationSubscriptions.get(conversationId);
    if (!entry || entry.stompSub) return;

    entry.stompSub = activeClient.subscribe(conversationTopic(conversationId), (frame) => {
      try {
        const payload = JSON.parse(frame.body);
        dispatchEvent(conversationId, payload);
      } catch {
        // ignore malformed frames
      }
    });
  });
}

/**
 * Subscribe to real-time conversation events.
 * Listener receives payloads: message:new, conversation:read.
 * Returns an unsubscribe function.
 */
export function subscribeToConversation(conversationId, listener) {
  if (!conversationId || typeof listener !== 'function') {
    return () => {};
  }

  ensureConversationSubscription(conversationId);
  const entry = conversationSubscriptions.get(conversationId);
  entry.listeners.add(listener);

  return () => {
    const current = conversationSubscriptions.get(conversationId);
    if (!current) return;
    current.listeners.delete(listener);
    if (current.listeners.size === 0) {
      current.stompSub?.unsubscribe();
      conversationSubscriptions.delete(conversationId);
    }
  };
}

export function markConversationReadViaSocket(conversationId) {
  if (!conversationId) return;
  ensureClient().then((activeClient) => {
    if (!activeClient?.connected) return;
    activeClient.publish({
      destination: '/app/chat/read',
      body: JSON.stringify({ conversationId }),
    });
  });
}

export function disconnectChatRealtime() {
  conversationSubscriptions.forEach((entry) => entry.stompSub?.unsubscribe());
  conversationSubscriptions.clear();
  connectPromise = null;
  if (client) {
    client.deactivate();
    client = null;
  }
}
