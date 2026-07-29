import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api/routeRequest.js', () => ({
  routeRequest: ({ mockFn }) => mockFn(),
}));

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
};

const {
  deleteMessage,
  editMessage,
  getChatFeatureSupport,
  getMessages,
  sendMessage,
  toggleMessageReaction,
} = await import('./chatService.js');

describe('chatService mock messaging', () => {
  beforeEach(() => {
    store.clear();
    const messages = Array.from({ length: 35 }, (_, index) => ({
      id: `m-${index + 1}`,
      senderId: index % 2 ? 'parent' : 'teacher',
      text: `Message ${index + 1}`,
      sentAt: new Date(2026, 0, 1, 0, index).toISOString(),
    }));
    localStorage.setItem('sb_messages', JSON.stringify({ conversation: messages }));
    localStorage.setItem('sb_conversations', JSON.stringify([{
      id: 'conversation',
      participants: ['parent', 'teacher'],
      participantNames: { parent: 'Parent', teacher: 'Teacher' },
      unread: { parent: 0, teacher: 0 },
    }]));
  });

  it('exposes full feature support in mock mode', () => {
    expect(getChatFeatureSupport()).toEqual({
      attachments: true,
      edit: true,
      delete: true,
      reactions: true,
    });
  });

  it('returns cursor-paginated message pages', async () => {
    const first = await getMessages('conversation', { limit: 30 });
    expect(first.items).toHaveLength(30);
    expect(first.items[0].id).toBe('m-6');
    expect(first.hasMore).toBe(true);

    const older = await getMessages('conversation', { limit: 30, before: first.nextCursor });
    expect(older.items.map((message) => message.id)).toEqual(['m-1', 'm-2', 'm-3', 'm-4', 'm-5']);
    expect(older.hasMore).toBe(false);
  });

  it('sends, edits, reacts to, and deletes a message', async () => {
    const sent = await sendMessage('conversation', 'parent', 'Hello', [{
      id: 'attachment-1',
      name: 'note.pdf',
      mimeType: 'application/pdf',
      size: 100,
      url: 'data:application/pdf;base64,AA==',
    }]);
    expect(sent.attachments).toHaveLength(1);

    const edited = await editMessage('conversation', sent.id, 'Hello again');
    expect(edited.text).toBe('Hello again');
    expect(edited.editedAt).toBeTruthy();

    const reacted = await toggleMessageReaction('conversation', sent.id, 'teacher', '👍');
    expect(reacted.reactions['👍']).toEqual(['teacher']);

    const removedReaction = await toggleMessageReaction('conversation', sent.id, 'teacher', '👍');
    expect(removedReaction.reactions['👍']).toBeUndefined();

    const deleted = await deleteMessage('conversation', sent.id);
    expect(deleted).toMatchObject({ deleted: true, text: '', attachments: [] });
  });
});
