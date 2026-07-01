import { INITIAL_NOTIFICATIONS } from '../data/mockNotifications.js';
import { delay, getStore, setStore } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';

const KEY = 'sb_notifications';

function getAll() {
  return getStore(KEY, INITIAL_NOTIFICATIONS);
}

export async function getNotifications(userId) {
  return routeRequest({
    mockFn: async () => {
      await delay(200);
      return getAll()
        .filter((n) => n.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    apiFn: () => api.get('/notifications'),
  });
}

export async function markAsRead(id) {
  return routeRequest({
    mockFn: async () => {
      const notifs = getAll();
      const idx = notifs.findIndex((n) => n.id === id);
      if (idx >= 0) {
        notifs[idx].read = true;
        setStore(KEY, notifs);
      }
    },
    apiFn: () => api.post(`/notifications/${id}/read`),
  });
}

export async function markAllRead(userId) {
  return routeRequest({
    mockFn: async () => {
      const notifs = getAll().map((n) => (n.userId === userId ? { ...n, read: true } : n));
      setStore(KEY, notifs);
    },
    apiFn: () => api.post('/notifications/read-all'),
  });
}

export function getUnreadCount(userId) {
  return getAll().filter((n) => n.userId === userId && !n.read).length;
}
