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

  it('clears unread when the API reports an explicit zero', () => {
    const previous = patchConversationUnread({ id: 'c1' }, 'parent', 4);
    const merged = mergeConversationUnread(previous, {
      id: 'c1',
      lastMessage: 'Latest update',
      lastMessageSenderId: 'teacher',
      unreadCount: 0,
    }, 'parent');

    expect(getConversationUnread(merged, 'parent')).toBe(0);
  });

  it('keeps a locally read conversation at zero when a refresh omits unread fields', () => {
    const previous = patchConversationUnread({
      id: 'c1',
      lastMessage: 'Latest update',
      lastMessageAt: '2026-07-29T10:00:00Z',
    }, 'parent', 0);

    const merged = mergeConversationUnread(previous, {
      id: 'c1',
      lastMessage: 'Latest update',
      lastMessageAt: '2026-07-29T10:00:00Z',
      lastMessageSenderId: 'teacher',
    }, 'parent');

    expect(getConversationUnread(merged, 'parent')).toBe(0);
  });

  it('never inflates a refreshed count with a stale local count', () => {
    const previous = patchConversationUnread({ id: 'c1' }, 'parent', 4);
    const merged = mergeConversationUnread(previous, {
      id: 'c1',
      lastMessage: 'New message',
      lastMessageAt: '2026-07-30T10:00:00Z',
      lastMessageSenderId: 'teacher',
      unreadCounts: { parent: 1 },
    }, 'parent');

    expect(getConversationUnread(merged, 'parent')).toBe(1);
  });

  it('ignores unread attributed to the signed-in user', () => {
    const conversation = normalizeConversation({
      id: 'c1',
      lastMessage: 'See you tomorrow',
      lastMessageAt: '2026-07-29T10:00:00Z',
      lastMessageSenderId: 'parent',
    }, 'parent');

    expect(getConversationUnread(conversation, 'parent')).toBe(0);
  });

  it('sums unread counts without allowing invalid values', () => {
    expect(sumConversationUnread([
      { unread: { parent: 2 } },
      { unreadCount: 3 },
      { unread: { parent: -4 } },
    ], 'parent')).toBe(5);
  });
});
