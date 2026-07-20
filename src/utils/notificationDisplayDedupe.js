/**
 * Cross-channel display dedupe (STOMP toast + FCM foreground + multi-hook mounts).
 * Keyed by notification id so the same event only surfaces once in the UI.
 */

const shown = new Map();
const DEFAULT_TTL_MS = 90_000;

function prune(now = Date.now()) {
  for (const [id, expiresAt] of shown) {
    if (expiresAt <= now) shown.delete(id);
  }
}

/**
 * @param {string|null|undefined} notificationId
 * @param {number} [ttlMs]
 * @returns {boolean} true if this caller should display the notification
 */
export function claimNotificationDisplay(notificationId, ttlMs = DEFAULT_TTL_MS) {
  if (!notificationId) return true;
  const now = Date.now();
  prune(now);
  if (shown.has(notificationId)) return false;
  shown.set(notificationId, now + ttlMs);
  return true;
}

/** @param {string|null|undefined} notificationId */
export function wasNotificationDisplayed(notificationId) {
  if (!notificationId) return false;
  prune();
  return shown.has(notificationId);
}

/** Test helper */
export function clearNotificationDisplayDedupe() {
  shown.clear();
}
