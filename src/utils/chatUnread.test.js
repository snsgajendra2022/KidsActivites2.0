import { describe, expect, it } from 'vitest';
import {
  getConversationUnread,
  mergeConversationUnread,
  normalizeConversation,
  patchConversationUnread,
  sumConversationUnread,
} from './chatUnread.js';

describe('chat unread helpers', () => {
  it('normalizes nested message previews and user unread counts', () => {
    const conversation = normalizeConversation({
      id: 'c1',
      lastMessage: {
        text: 'Latest update',
        sentAt: '2026-07-29T10:00:00Z',
        senderId: 'teacher',
      },
      unreadCounts: { parent: 3 },
    }, 'parent');

    expect(conversation.lastMessage).toBe('Latest update');
    expect(conversation.lastMessageSenderId).toBe('teacher');
    expect(getConversationUnread(conversation, 'parent')).toBe(3);
  });

  it('preserves live unread state when a refresh omits unread fields', () => {
    const previous = patchConversationUnread({ id: 'c1' }, 'parent', 4);
    const merged = mergeConversationUnread(previous, {
      id: 'c1',
      lastMessage: 'New message',
    }, 'parent');

    expect(getConversationUnread(merged, 'parent')).toBe(4);
  });

  it('sums unread counts without allowing invalid values', () => {
    expect(sumConversationUnread([
      { unread: { parent: 2 } },
      { unreadCount: 3 },
      { unread: { parent: -4 } },
    ], 'parent')).toBe(5);
  });
});
