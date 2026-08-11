import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { refreshAccessToken } from './api/client.js';
import { API_BASE_URL, resolveTenantSlug, TENANT_HEADER } from './api/config.js';
import { getAccessToken } from './api/tokenStorage.js';

function getChatSocketUrl() {
  const base = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  const tenantSlug = resolveTenantSlug();
  const query = tenantSlug ? `?${TENANT_HEADER}=${encodeURIComponent(tenantSlug)}` : '';
  return `${base}/api/v1/ws/chat${query}`;
}

/** True when JWT is missing/unreadable or within skewSeconds of exp. */
function isAccessTokenExpired(token, skewSeconds = 45) {
  if (!token) return true;
  try {
    const segment = token.split('.')[1];
    if (!segment) return true;
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(segment.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded));
    return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
  } catch {
    return true;
  }
}

async function buildConnectHeaders() {
  let token = getAccessToken();
  if (isAccessTokenExpired(token)) {
    token = (await refreshAccessToken()) || getAccessToken();
  }
  const tenantSlug = resolveTenantSlug();
  if (!token || !tenantSlug) {
    throw new Error('Chat socket requires a valid session');
  }
  return {
    Authorization: `Bearer ${token}`,
    [TENANT_HEADER]: tenantSlug,
  };
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

function createClient() {
  const stompClient = new Client({
    // Edge proxy strips Upgrade and buffers long-lived streams — xhr-polling only.
    webSocketFactory: () =>
      new SockJS(getChatSocketUrl(), null, {
        transports: ['xhr-polling'],
      }),
    // Refreshed on every CONNECT so reconnects after the 15m access-token TTL succeed.
    beforeConnect: async () => {
      stompClient.connectHeaders = await buildConnectHeaders();
    },
    reconnectDelay: 5000,
    onDisconnect: () => {
      connectPromise = null;
    },
    onStompError: () => {
      connectPromise = null;
    },
  });
  return stompClient;
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

  if (!client) {
    client = createClient();
  }

  connectPromise = new Promise((resolve) => {
    client.onConnect = () => {
      // Re-bind conversation subscriptions after reconnect.
      conversationSubscriptions.forEach((entry, conversationId) => {
        if (entry.stompSub) return;
        entry.stompSub = client.subscribe(conversationTopic(conversationId), (frame) => {
          try {
            const payload = JSON.parse(frame.body);
            dispatchEvent(conversationId, payload);
          } catch {
            // ignore malformed frames
          }
        });
      });
      resolve(client);
    };
    client.onWebSocketClose = () => {
      connectPromise = null;
      // SockJS/STOMP session died — drop stomp subs so onConnect re-subscribes.
      conversationSubscriptions.forEach((entry) => {
        entry.stompSub = null;
      });
    };
    if (!client.active) {
      client.activate();
    }
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
 * Listener receives payloads such as message:new, message:updated,
 * message:deleted, message:reaction, conversation:read, typing, presence:update.
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

function publish(destination, body) {
  ensureClient().then((activeClient) => {
    if (!activeClient?.connected) return;
    activeClient.publish({
      destination,
      body: JSON.stringify(body),
    });
  });
}

export function publishTyping(conversationId, isTyping) {
  if (!conversationId) return;
  publish('/app/chat/typing', { conversationId, isTyping });
}

export function publishPresence(status) {
  publish('/app/chat/presence', { status });
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
