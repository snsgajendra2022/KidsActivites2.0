function coerceUnreadCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

function lookupMapValue(map, userId) {
  if (map == null || userId == null) return null;
  if (typeof map === 'number') return map;
  if (typeof map !== 'object') return null;

  if (map[userId] !== undefined) return map[userId];
  if (map[String(userId)] !== undefined) return map[String(userId)];

  const uid = String(userId).toLowerCase();
  const key = Object.keys(map).find((k) => String(k).toLowerCase() === uid);
  return key !== undefined ? map[key] : null;
}

function extractLastMessageText(conv) {
  if (typeof conv?.lastMessage === 'string') return conv.lastMessage;
  const nested = conv?.lastMessage;
  if (nested && typeof nested === 'object') {
    return nested.text ?? nested.content ?? nested.body ?? nested.message ?? '';
  }
  return conv?.lastMessagePreview ?? conv?.preview ?? '';
}

function extractLastMessageAt(conv) {
  return conv?.lastMessageAt
    ?? conv?.lastMessage?.sentAt
    ?? conv?.lastMessage?.createdAt
    ?? conv?.updatedAt
    ?? null;
}

function extractLastMessageSenderId(conv) {
  return conv?.lastMessageSenderId
    ?? conv?.lastSenderId
    ?? conv?.lastMessage?.senderId
    ?? conv?.lastMessage?.sender?.id
    ?? null;
}

function lookupReadAt(conv, userId) {
  const sources = [conv?.lastReadAt, conv?.readAt, conv?.readReceipts, conv?.participantReadAt];
  for (const source of sources) {
    const value = lookupMapValue(source, userId);
    if (value) return value;
  }
  return conv?.myLastReadAt ?? conv?.lastReadAtForMe ?? null;
}

/** True when the API returned a user-specific unread value for this user. */
export function hasExplicitUnread(conv, userId) {
  if (!conv || !userId) return false;

  const mapSources = [conv.unread, conv.unreadCounts, conv.participantUnread];
  for (const source of mapSources) {
    const mapValue = lookupMapValue(source, userId);
    if (mapValue !== null && mapValue !== undefined) return true;
  }

  const userFields = [
    conv.myUnreadCount,
    conv.unreadForMe,
    conv.unreadMessages,
    conv.unreadMessageCount,
  ];
  if (userFields.some((field) => Number.isFinite(field))) return true;

  if (conv.hasUnread === true || conv.isUnread === true) return true;

  // Top-level unreadCount only counts when it signals unread messages.
  if (Number.isFinite(conv.unreadCount) && conv.unreadCount > 0) return true;

  return false;
}

/** Unread count for one conversation for the signed-in user. */
export function getConversationUnread(conv, userId) {
  if (!conv || !userId) return 0;

  const fromMap = coerceUnreadCount(
    lookupMapValue(conv.unread, userId)
    ?? lookupMapValue(conv.unreadCounts, userId)
    ?? lookupMapValue(conv.participantUnread, userId),
  );
  if (fromMap > 0) return fromMap;

  const directFields = [
    conv.unreadCount,
    conv.myUnreadCount,
    conv.unreadForMe,
    conv.unreadMessages,
    conv.unreadMessageCount,
  ];
  for (const field of directFields) {
    const count = coerceUnreadCount(field);
    if (count > 0) return count;
  }

  if (Number.isFinite(conv.unreadCount) && conv.unreadCount === 0) return 0;
  if (fromMap === 0 && lookupMapValue(conv.unread, userId) === 0) return 0;

  if (conv.hasUnread === true || conv.isUnread === true) return 1;

  const lastSender = extractLastMessageSenderId(conv);
  const lastAt = extractLastMessageAt(conv);
  if (lastSender && String(lastSender) !== String(userId) && lastAt) {
    const userReadAt = lookupReadAt(conv, userId);
    if (!userReadAt) return 1;
    const readTime = new Date(userReadAt).getTime();
    const msgTime = new Date(lastAt).getTime();
    if (Number.isFinite(readTime) && Number.isFinite(msgTime) && msgTime > readTime) {
      return 1;
    }
  }

  return 0;
}

export function sumConversationUnread(conversations, userId) {
  if (!userId) return 0;
  return (conversations || []).reduce(
    (sum, conv) => sum + getConversationUnread(conv, userId),
    0,
  );
}

/** Normalize API/mock conversation shape for UI + unread helpers. */
export function normalizeConversation(conv, userId) {
  if (!conv || typeof conv !== 'object') return conv;

  const lastMessage = extractLastMessageText(conv);
  const lastMessageAt = extractLastMessageAt(conv);
  const lastMessageSenderId = extractLastMessageSenderId(conv);
  const unreadCount = getConversationUnread(
    { ...conv, lastMessage, lastMessageAt, lastMessageSenderId },
    userId,
  );

  const unread = { ...(conv.unread || {}) };
  if (userId) {
    unread[userId] = unreadCount;
  }

  return {
    ...conv,
    lastMessage,
    lastMessageAt,
    lastMessageSenderId,
    unread,
    unreadCount,
  };
}

export function normalizeConversations(list, userId) {
  const items = Array.isArray(list) ? list : [];
  return items.map((conv) => normalizeConversation(conv, userId));
}

/** Keep websocket/local unread when the API omits per-user unread fields. */
export function mergeConversationUnread(prevConv, nextConv, userId) {
  if (!nextConv) return nextConv;
  if (!prevConv || !userId) return normalizeConversation(nextConv, userId);

  const normalized = normalizeConversation(nextConv, userId);
  const apiUnread = getConversationUnread(normalized, userId);
  const prevUnread = getConversationUnread(prevConv, userId);

  if (hasExplicitUnread(nextConv, userId)) {
    return normalized;
  }

  const mergedUnread = Math.max(prevUnread, apiUnread);
  if (mergedUnread <= 0) return normalized;

  return patchConversationUnread(normalized, userId, mergedUnread);
}

export function mergeConversations(prevList, nextList, userId) {
  const prevById = new Map((prevList || []).map((conv) => [conv.id, conv]));
  return (nextList || []).map((conv) => mergeConversationUnread(prevById.get(conv.id), conv, userId));
}

export function patchConversationUnread(conv, userId, unreadCount) {
  const count = Math.max(0, Math.floor(Number(unreadCount) || 0));
  return {
    ...conv,
    unread: { ...(conv?.unread || {}), [userId]: count },
    unreadCount: count,
  };
}
