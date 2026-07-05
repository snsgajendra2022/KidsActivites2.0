import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';

function deviceName() {
  if (typeof navigator === 'undefined') return 'Web Browser';
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome Browser';
  if (ua.includes('Firefox')) return 'Firefox Browser';
  if (ua.includes('Safari')) return 'Safari Browser';
  return 'Web Browser';
}

export async function initQrLogin() {
  return routeRequest({
    mockFn: async () => ({
      sessionId: 'mock-qr-session',
      qrPayload: 'schoolbridge://pair?tenant=demo&session=mock&nonce=abc123',
      expiresIn: 300,
      status: 'PENDING',
    }),
    apiFn: async () => {
      const data = await api.post('/auth/qr/init', {
        deviceName: deviceName(),
        action: 'WEB_LOGIN',
      });
      return data;
    },
  });
}

export async function pollQrLoginStatus(sessionId) {
  return routeRequest({
    mockFn: async () => ({ status: 'PENDING', expiresIn: 120 }),
    apiFn: async () => api.get(`/auth/qr/${sessionId}/status`),
  });
}

export function applyQrLoginTokens(data) {
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
    tokenType: data.tokenType ?? 'Bearer',
    user: data.user,
  };
}
