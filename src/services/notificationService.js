import { INITIAL_NOTIFICATIONS } from '../data/mockNotifications.js';
import { delay, getStore, setStore } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';

const KEY = 'sb_notifications';

function getAll() {
  return getStore(KEY, INITIAL_NOTIFICATIONS);
}

function sortNotifications(notifications) {
  return [...notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function toResult(notifications) {
  const list = Array.isArray(notifications) ? notifications : [];
  return {
    notifications: list,
    unreadCount: list.filter((n) => !n.read).length,
  };
}

export async function getNotifications(userId) {
  return routeRequest({
    mockFn: async () => {
      await delay(200);
      return toResult(
        sortNotifications(getAll().filter((n) => n.userId === userId)),
      );
    },
    apiFn: async () => {
      const { data, meta } = await api.getWithMeta('/notifications');
      const notifications = Array.isArray(data) ? data : [];
      return {
        notifications,
        unreadCount: Number(meta?.unreadCount ?? notifications.filter((n) => !n.read).length),
      };
    },
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

/** Called when a notice is published — does not affect existing notification types. */
export function pushNoticeNotification({ userId, noticeId, title }) {
  const notifs = getAll();
  const exists = notifs.some((n) => n.userId === userId && n.noticeId === noticeId);
  if (exists) return;
  notifs.unshift({
    id: `notif-notice-${noticeId}-${userId}`,
    userId,
    noticeId,
    title: `New Notice: ${title}`,
    message: 'A new notice has been shared by your school.',
    type: 'notice',
    read: false,
    createdAt: new Date().toISOString(),
    link: `/notice-board/${noticeId}`,
  });
  setStore(KEY, notifs);
}
