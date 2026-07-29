import { INITIAL_CONVERSATIONS, INITIAL_MESSAGES } from '../data/mockChat.js';
import { normalizeConversations } from '../utils/chatUnread.js';
import { FILE_RULES, validateFile } from '../utils/uploadValidation.js';
import { delay, getStore, setStore } from './mockApi.js';
import { ApiError, api } from './api/client.js';
import { isApiEnabled, isForceMock } from './api/config.js';
import { routeRequest } from './api/routeRequest.js';

function unwrapConversationList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.conversations)) return data.conversations;
  return [];
}

const CONV_KEY = 'sb_conversations';
const MSG_KEY = 'sb_messages';

/** Features that work fully in mock mode and degrade when the live API lacks them. */
const ADVANCED_FEATURES = {
  attachments: true,
  edit: true,
  delete: true,
  reactions: true,
};

export const CHAT_ATTACHMENT_ACCEPT = FILE_RULES.chatAttachment.accept.join(',');
export const CHAT_ATTACHMENT_MAX_BYTES = FILE_RULES.chatAttachment.maxSizeMB * 1024 * 1024;

function getConversations() {
  return getStore(CONV_KEY, INITIAL_CONVERSATIONS);
}

function getAllMessages() {
  return getStore(MSG_KEY, INITIAL_MESSAGES);
}

function normalizeMessagePage(data, meta = {}) {
  const items = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.messages)
        ? data.messages
        : [];
  const pageMeta = data?.meta || meta || {};
  return {
    items,
    hasMore: Boolean(data?.hasMore ?? pageMeta.hasMore ?? pageMeta.nextCursor),
    nextCursor: data?.nextCursor ?? pageMeta.nextCursor ?? null,
  };
}

function updateMockMessage(conversationId, messageId, updater) {
  const allMessages = getAllMessages();
  const list = allMessages[conversationId] || [];
  const index = list.findIndex((message) => message.id === messageId);
  if (index < 0) throw new Error('Message not found.');
  list[index] = updater(list[index]);
  allMessages[conversationId] = list;
  setStore(MSG_KEY, allMessages);
  return list[index];
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read this attachment.'));
    reader.readAsDataURL(file);
  });
}

function isUnsupportedApiError(error) {
  return error instanceof ApiError && [404, 405, 501].includes(error.status);
}

function markFeatureUnavailable(feature) {
  if (!ADVANCED_FEATURES[feature]) return;
  ADVANCED_FEATURES[feature] = false;
}

export function getChatFeatureSupport() {
  // Mock mode supports the full UI surface. Live mode starts optimistic and soft-disables on 404/405/501.
  if (isForceMock() || !isApiEnabled()) {
    return {
      attachments: true,
      edit: true,
      delete: true,
      reactions: true,
    };
  }
  return { ...ADVANCED_FEATURES };
}

async function withFeatureSupport(feature, apiFn) {
  try {
    return await apiFn();
  } catch (error) {
    if (isUnsupportedApiError(error)) {
      markFeatureUnavailable(feature);
      const err = new ApiError(
        'This chat feature is not available on the school server yet.',
        error.status,
        'CHAT_FEATURE_UNAVAILABLE',
      );
      err.feature = feature;
      throw err;
    }
    throw error;
  }
}

export async function getChatContacts() {
  return routeRequest({
    mockFn: async () => {
      await delay();
      const convs = getConversations();
      return Object.entries(convs[0]?.participantNames || {})
        .filter(([id]) => id !== 'usr-school-admin')
        .map(([id, name]) => ({
          id,
          name,
          role: id.includes('admin') ? 'admin' : id.includes('teacher') ? 'teacher' : 'parent',
          email: `${id}@demo`,
        }));
    },
    apiFn: () => api.get('/chat/contacts'),
  });
}

export async function createConversation(participantId) {
  return routeRequest({
    mockFn: async () => {
      await delay();
      const convs = getConversations();
      const existing = convs.find((c) => c.participants.includes(participantId));
      if (existing) return existing;
      const conv = {
        id: `conv-${Date.now()}`,
        participants: ['usr-school-admin', participantId],
        participantNames: { 'usr-school-admin': 'School Admin', [participantId]: 'Contact' },
        lastMessage: '',
        lastMessageAt: new Date().toISOString(),
        unread: { 'usr-school-admin': 0, [participantId]: 0 },
        role: 'teacher',
      };
      convs.unshift(conv);
      setStore(CONV_KEY, convs);
      return conv;
    },
    apiFn: () => api.post('/chat/conversations', { participantId }),
  });
}

export async function getConversationsForUser(userId) {
  return routeRequest({
    mockFn: async () => {
      await delay();
      const list = getConversations().filter((c) => c.participants.includes(userId));
      return normalizeConversations(list, userId);
    },
    apiFn: async () => {
      const data = await api.get('/chat/conversations');
      return normalizeConversations(unwrapConversationList(data), userId);
    },
  });
}

export async function getTotalUnreadChatCount(userId) {
  return routeRequest({
    mockFn: async () => {
      await delay();
      const { sumConversationUnread } = await import('../utils/chatUnread.js');
      const list = getConversations().filter((c) => c.participants.includes(userId));
      return sumConversationUnread(list, userId);
    },
    apiFn: async () => {
      try {
        const data = await api.get('/chat/unread-count');
        if (Number.isFinite(data)) return data;
        if (Number.isFinite(data?.count)) return data.count;
        if (Number.isFinite(data?.total)) return data.total;
        if (Number.isFinite(data?.unreadCount)) return data.unreadCount;
      } catch {
        // Optional endpoint — fall back to per-conversation totals.
      }
      return null;
    },
  });
}

export async function getMessages(conversationId, { limit = 30, before } = {}) {
  return routeRequest({
    mockFn: async () => {
      await delay();
      const all = [...(getAllMessages()[conversationId] || [])]
        .sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
      const end = before
        ? Math.max(0, all.findIndex((message) => message.id === before))
        : all.length;
      const start = Math.max(0, end - limit);
      return {
        items: all.slice(start, end),
        hasMore: start > 0,
        nextCursor: start > 0 ? all[start].id : null,
      };
    },
    apiFn: async () => {
      const { data: response, meta } = await api.getWithMeta(
        `/chat/conversations/${conversationId}/messages`,
        { limit, before },
      );
      return normalizeMessagePage(response, meta);
    },
  });
}

export async function sendMessage(conversationId, senderId, text, attachments = []) {
  return routeRequest({
    mockFn: async () => {
      await delay(300);
      const allMessages = getAllMessages();
      const messages = allMessages[conversationId] || [];
      const msg = {
        id: `m-${Date.now()}`,
        senderId,
        text,
        attachments,
        reactions: {},
        sentAt: new Date().toISOString(),
      };
      messages.push(msg);
      allMessages[conversationId] = messages;
      setStore(MSG_KEY, allMessages);

      const convs = getConversations();
      const idx = convs.findIndex((c) => c.id === conversationId);
      if (idx >= 0) {
        const conv = convs[idx];
        conv.lastMessage = text || (attachments[0]?.name ? `Attachment: ${attachments[0].name}` : '');
        conv.lastMessageAt = msg.sentAt;
        conv.lastMessageSenderId = senderId;
        conv.unread = { ...(conv.unread || {}) };
        conv.participants.forEach((pid) => {
          if (pid !== senderId) {
            conv.unread[pid] = (conv.unread[pid] || 0) + 1;
          }
        });
        setStore(CONV_KEY, convs);
      }
      return msg;
    },
    apiFn: () => {
      // Documented live contract is `{ text }`; only include attachments when present.
      const body = attachments.length ? { text, attachments } : { text };
      return api.post(`/chat/conversations/${conversationId}/messages`, body);
    },
  });
}

export async function uploadChatAttachment(conversationId, file) {
  if (!file) throw new Error('Choose a file to attach.');
  const validation = validateFile(file, 'chatAttachment');
  if (!validation.valid) throw new Error(validation.error);

  return routeRequest({
    mockFn: async () => {
      await delay(250);
      return {
        id: `att-${Date.now()}`,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        url: await fileToDataUrl(file),
      };
    },
    apiFn: () => withFeatureSupport('attachments', async () => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post(`/chat/conversations/${conversationId}/attachments`, formData);
    }),
  });
}

export async function editMessage(conversationId, messageId, text) {
  const trimmed = text?.trim();
  if (!trimmed) throw new Error('Message cannot be empty.');
  return routeRequest({
    mockFn: async () => {
      await delay(150);
      return updateMockMessage(conversationId, messageId, (message) => ({
        ...message,
        text: trimmed,
        editedAt: new Date().toISOString(),
      }));
    },
    apiFn: () => withFeatureSupport(
      'edit',
      () => api.patch(`/chat/conversations/${conversationId}/messages/${messageId}`, { text: trimmed }),
    ),
  });
}

export async function deleteMessage(conversationId, messageId) {
  return routeRequest({
    mockFn: async () => {
      await delay(150);
      return updateMockMessage(conversationId, messageId, (message) => ({
        ...message,
        text: '',
        attachments: [],
        reactions: {},
        deleted: true,
        deletedAt: new Date().toISOString(),
      }));
    },
    apiFn: () => withFeatureSupport(
      'delete',
      () => api.delete(`/chat/conversations/${conversationId}/messages/${messageId}`),
    ),
  });
}

export async function toggleMessageReaction(conversationId, messageId, userId, emoji) {
  return routeRequest({
    mockFn: async () => {
      await delay(100);
      return updateMockMessage(conversationId, messageId, (message) => {
        const reactions = { ...(message.reactions || {}) };
        const users = new Set(reactions[emoji] || []);
        if (users.has(userId)) users.delete(userId);
        else users.add(userId);
        if (users.size) reactions[emoji] = [...users];
        else delete reactions[emoji];
        return { ...message, reactions };
      });
    },
    apiFn: () => withFeatureSupport(
      'reactions',
      () => api.post(
        `/chat/conversations/${conversationId}/messages/${messageId}/reactions`,
        { emoji },
      ),
    ),
  });
}

export async function markConversationRead(conversationId, userId) {
  return routeRequest({
    mockFn: async () => {
      const convs = getConversations();
      const idx = convs.findIndex((c) => c.id === conversationId);
      if (idx >= 0) {
        convs[idx].unread = { ...convs[idx].unread, [userId]: 0 };
        setStore(CONV_KEY, convs);
      }
    },
    apiFn: () => api.post(`/chat/conversations/${conversationId}/read`),
  });
}
