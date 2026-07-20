const STORAGE_KEY = 'sb_notifications_dismissed_ids';

function readSet() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeSet(set) {
  try {
    // Cap growth — keep the most recent dismissals.
    const ids = [...set].slice(-500);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore quota / private mode.
  }
}

export function getDismissedNotificationIds() {
  return readSet();
}

export function dismissNotificationIds(ids) {
  if (!ids?.length) return;
  const next = readSet();
  ids.forEach((id) => {
    if (id) next.add(id);
  });
  writeSet(next);
}

export function isNotificationDismissed(id) {
  return Boolean(id) && readSet().has(id);
}

export function filterOutDismissed(notifications) {
  const dismissed = readSet();
  if (dismissed.size === 0) return notifications;
  return notifications.filter((n) => !dismissed.has(n.id));
}
