import { INITIAL_CONVERSATIONS, INITIAL_MESSAGES } from '../data/mockChat.js';
import { normalizeConversations } from '../utils/chatUnread.js';
import { delay, getStore, setStore } from './mockApi.js';
import { api } from './api/client.js';
import { routeRequest } from './api/routeRequest.js';

function unwrapConversationList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.conversations)) return data.conversations;
  return [];
}

const CONV_KEY = 'sb_conversations';
const MSG_KEY = 'sb_messages';

function getConversations() {
  return getStore(CONV_KEY, INITIAL_CONVERSATIONS);
}

function getAllMessages() {
  return getStore(MSG_KEY, INITIAL_MESSAGES);
}

export async function getChatContacts() {
  return routeRequest({
    mockFn: async () => {
      await delay();
      const convs = getConversations();
      const userIds = new Set(convs.flatMap((c) => c.participants));
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

export async function getMessages(conversationId) {
  return routeRequest({
    mockFn: async () => {
      await delay();
      return getAllMessages()[conversationId] || [];
    },
    apiFn: () => api.get(`/chat/conversations/${conversationId}/messages`),
  });
}

export async function sendMessage(conversationId, senderId, text) {
  return routeRequest({
    mockFn: async () => {
      await delay(300);
      const allMessages = getAllMessages();
      const messages = allMessages[conversationId] || [];
      const msg = { id: `m-${Date.now()}`, senderId, text, sentAt: new Date().toISOString() };
      messages.push(msg);
      allMessages[conversationId] = messages;
      setStore(MSG_KEY, allMessages);

      const convs = getConversations();
      const idx = convs.findIndex((c) => c.id === conversationId);
      if (idx >= 0) {
        const conv = convs[idx];
        conv.lastMessage = text;
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
    apiFn: () => api.post(`/chat/conversations/${conversationId}/messages`, { text }),
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
