import { getTrackingWebSocketUrl } from './trackingApi.js';

/**
 * Production WebSocket client for live bus tracking.
 * Reconnects with backoff. No fake location synthesis.
 * Callers should REST-resync on `connected` after a prior disconnect.
 */
export function createTrackingSocket({
  vehicleId,
  onEvent,
  onStatus,
} = {}) {
  let socket = null;
  let closedByUser = false;
  let attempt = 0;
  let reconnectTimer = null;
  let pingTimer = null;
  let hadDisconnect = false;

  function clearTimers() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  }

  function connect() {
    clearTimers();
    const url = getTrackingWebSocketUrl({ vehicleId });
    if (!url) {
      onStatus?.({ state: 'idle', reason: 'fixture_or_unavailable' });
      return;
    }
    onStatus?.({ state: 'connecting', attempt });

    socket = new WebSocket(url);

    socket.addEventListener('open', () => {
      const isReconnect = hadDisconnect || attempt > 0;
      attempt = 0;
      onStatus?.({ state: 'connected', reconnect: isReconnect });
      hadDisconnect = false;
      pingTimer = setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000);
    });

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);
        const type = payload?.type || payload?.event || payload?.eventType;
        onEvent?.(type ? { ...payload, type } : payload);
      } catch {
        // ignore non-JSON frames
      }
    });

    socket.addEventListener('close', () => {
      clearTimers();
      hadDisconnect = true;
      onStatus?.({ state: 'disconnected' });
      if (closedByUser) return;
      attempt += 1;
      const delay = Math.min(30000, 1000 * (2 ** Math.min(attempt, 5)));
      reconnectTimer = setTimeout(connect, delay);
    });

    socket.addEventListener('error', () => {
      onStatus?.({ state: 'error' });
      socket?.close();
    });
  }

  connect();

  return {
    close() {
      closedByUser = true;
      clearTimers();
      socket?.close();
    },
  };
}
