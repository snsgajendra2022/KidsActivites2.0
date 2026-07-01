import { INITIAL_NOTIFICATIONS } from '../data/mockNotifications.js';
import { delay, getStore, setStore } from './mockApi.js';

const KEY = 'sb_notifications';

function getAll() {
  return getStore(KEY, INITIAL_NOTIFICATIONS);
}

export async function getNotifications(userId) {
  await delay(200);
  return getAll().filter((n) => n.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function markAsRead(id) {
  const notifs = getAll();
  const idx = notifs.findIndex((n) => n.id === id);
  if (idx >= 0) {
    notifs[idx].read = true;
    setStore(KEY, notifs);
  }
}

export async function markAllRead(userId) {
  const notifs = getAll().map((n) => (n.userId === userId ? { ...n, read: true } : n));
  setStore(KEY, notifs);
}

export function getUnreadCount(userId) {
  return getAll().filter((n) => n.userId === userId && !n.read).length;
}
