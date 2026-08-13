import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearLocalChatReadState,
  getEffectiveConversationUnread,
  hasPendingLocalRead,
  markConversationReadLocally,
  sumEffectiveConversationUnread,
} from './localChatRead.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
};

const inferredUnread = {
  id: 'c1',
  lastMessage: 'Please check the fee receipt.',
  lastMessageAt: '2026-07-29T10:00:00Z',
  lastMessageSenderId: 'teacher',
};

describe('local chat read cursors', () => {
  beforeEach(() => {
    store.clear();
    clearLocalChatReadState();
  });

  it('clears a conversation the user has opened', () => {
    expect(getEffectiveConversationUnread(inferredUnread, 'parent')).toBe(1);

    markConversationReadLocally('parent', 'c1', inferredUnread.lastMessageAt);

    expect(getEffectiveConversationUnread(inferredUnread, 'parent')).toBe(0);
    expect(sumEffectiveConversationUnread([inferredUnread], 'parent')).toBe(0);
    expect(hasPendingLocalRead([inferredUnread], 'parent')).toBe(true);
  });

  it('counts a message that arrived after the read cursor', () => {
    markConversationReadLocally('parent', 'c1', inferredUnread.lastMessageAt);

    const newer = {
      ...inferredUnread,
      lastMessageAt: '2026-07-29T11:00:00Z',
      unreadCount: 2,
    };

    expect(getEffectiveConversationUnread(newer, 'parent')).toBe(2);
    expect(hasPendingLocalRead([newer], 'parent')).toBe(false);
  });

  it('keeps cursors per user', () => {
    markConversationReadLocally('parent', 'c1', inferredUnread.lastMessageAt);

    expect(getEffectiveConversationUnread(inferredUnread, 'teacher-2')).toBe(1);
  });

  it('never moves a cursor backwards', () => {
    markConversationReadLocally('parent', 'c1', '2026-07-29T12:00:00Z');
    markConversationReadLocally('parent', 'c1', '2026-07-29T09:00:00Z');

    expect(getEffectiveConversationUnread({
      ...inferredUnread,
      lastMessageAt: '2026-07-29T11:00:00Z',
    }, 'parent')).toBe(0);
  });
});
