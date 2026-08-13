import { getConversationUnread } from './chatUnread.js';

/**
 * Local read cursor per conversation, mirroring the mobile client.
 * `GET /chat/conversations` does not always echo a per-user read receipt, so
 * without this a conversation the user just opened keeps looking unread.
 */
const STORAGE_KEY = 'sb_chat_read_cursors';
const MAX_TRACKED_PER_USER = 200;

let cursorsByUser = null;

function loadCursors() {
  if (cursorsByUser) return cursorsByUser;
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    cursorsByUser = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    cursorsByUser = {};
  }
  return cursorsByUser;
}

function saveCursors(next) {
  cursorsByUser = next;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode / quota) — keep the in-memory cursors.
  }
}

function toTime(value) {
  if (!value) return NaN;
  return new Date(value).getTime();
}

/** Keep the most recently read conversations so the cache cannot grow forever. */
function prune(entries) {
  const keys = Object.keys(entries);
  if (keys.length <= MAX_TRACKED_PER_USER) return entries;
  return keys
    .sort((a, b) => toTime(entries[b]) - toTime(entries[a]))
    .slice(0, MAX_TRACKED_PER_USER)
    .reduce((acc, key) => {
      acc[key] = entries[key];
      return acc;
    }, {});
}

export function markConversationReadLocally(userId, conversationId, readUpToAt) {
  if (!userId || !conversationId) return;
  const stamp = readUpToAt || new Date().toISOString();
  const stampTime = toTime(stamp);
  if (!Number.isFinite(stampTime)) return;

  const store = loadCursors();
  const forUser = { ...(store[String(userId)] || {}) };
  const existingTime = toTime(forUser[conversationId]);
  if (Number.isFinite(existingTime) && existingTime >= stampTime) return;

  forUser[conversationId] = new Date(stampTime).toISOString();
  saveCursors({ ...store, [String(userId)]: prune(forUser) });
}

export function getConversationReadUpTo(userId, conversationId) {
  if (!userId || !conversationId) return null;
  return loadCursors()[String(userId)]?.[conversationId] ?? null;
}

export function clearLocalChatReadState(userId) {
  const store = loadCursors();
  if (!userId) {
    saveCursors({});
    return;
  }
  const next = { ...store };
  delete next[String(userId)];
  saveCursors(next);
}

/** Unread for one conversation, with a conversation the user already opened forced to 0. */
export function getEffectiveConversationUnread(conv, userId) {
  const unread = getConversationUnread(conv, userId);
  if (unread <= 0) return 0;

  const readUpTo = getConversationReadUpTo(userId, conv?.id);
  if (!readUpTo) return unread;

  const readTime = toTime(readUpTo);
  const lastMessageTime = toTime(conv?.lastMessageAt);
  if (Number.isFinite(readTime) && Number.isFinite(lastMessageTime) && lastMessageTime <= readTime) {
    return 0;
  }
  return unread;
}

export function sumEffectiveConversationUnread(conversations, userId) {
  if (!userId) return 0;
  return (conversations || []).reduce(
    (sum, conv) => sum + getEffectiveConversationUnread(conv, userId),
    0,
  );
}

/** True when a local read is waiting for the server to catch up. */
export function hasPendingLocalRead(conversations, userId) {
  if (!userId) return false;
  return (conversations || []).some(
    (conv) => getConversationUnread(conv, userId) > 0
      && getEffectiveConversationUnread(conv, userId) === 0,
  );
}
