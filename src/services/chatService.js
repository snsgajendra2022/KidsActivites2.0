import { INITIAL_CONVERSATIONS, INITIAL_MESSAGES } from '../data/mockChat.js';
import { delay, getStore, setStore } from './mockApi.js';

const CONV_KEY = 'sb_conversations';
const MSG_KEY = 'sb_messages';

function getConversations() {
  return getStore(CONV_KEY, INITIAL_CONVERSATIONS);
}

function getAllMessages() {
  return getStore(MSG_KEY, INITIAL_MESSAGES);
}

export async function getConversationsForUser(userId) {
  await delay();
  return getConversations().filter((c) => c.participants.includes(userId));
}

export async function getMessages(conversationId) {
  await delay();
  return getAllMessages()[conversationId] || [];
}

export async function sendMessage(conversationId, senderId, text) {
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
    convs[idx].lastMessage = text;
    convs[idx].lastMessageAt = msg.sentAt;
    setStore(CONV_KEY, convs);
  }
  return msg;
}

export async function markConversationRead(conversationId, userId) {
  const convs = getConversations();
  const idx = convs.findIndex((c) => c.id === conversationId);
  if (idx >= 0) {
    convs[idx].unread = { ...convs[idx].unread, [userId]: 0 };
    setStore(CONV_KEY, convs);
  }
}
