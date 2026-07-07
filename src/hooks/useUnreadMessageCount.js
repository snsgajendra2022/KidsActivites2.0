import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getConversationsForUser } from '../services/chatService.js';
import { subscribeToConversation } from '../services/chatRealtime.js';

export const CHAT_UNREAD_REFRESH_EVENT = 'chat:unread-refresh';

export function requestChatUnreadRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CHAT_UNREAD_REFRESH_EVENT));
  }
}

function getConversationUnread(conv, userId) {
  if (Number.isFinite(conv?.unreadCount)) return conv.unreadCount;
  return conv?.unread?.[userId] || 0;
}

function sumUnread(conversations, userId) {
  if (!userId) return 0;
  return (conversations || []).reduce(
    (sum, conv) => sum + getConversationUnread(conv, userId),
    0,
  );
}

/** Total unread chat messages for the signed-in user (all roles). */
export function useUnreadMessageCount() {
  const { user } = useAuth();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);

  const refresh = useCallback(() => {
    if (!user?.id) {
      setConversations([]);
      return Promise.resolve();
    }
    return getConversationsForUser(user.id)
      .then((list) => setConversations(Array.isArray(list) ? list : []))
      .catch(() => setConversations([]));
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh, location.pathname]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const onRefresh = () => { refresh(); };
    window.addEventListener(CHAT_UNREAD_REFRESH_EVENT, onRefresh);
    window.addEventListener('focus', onRefresh);

    const interval = setInterval(refresh, 60_000);

    return () => {
      window.removeEventListener(CHAT_UNREAD_REFRESH_EVENT, onRefresh);
      window.removeEventListener('focus', onRefresh);
      clearInterval(interval);
    };
  }, [user?.id, refresh]);

  const conversationIdsKey = useMemo(
    () => conversations.map((c) => c.id).sort().join(','),
    [conversations],
  );

  useEffect(() => {
    if (!user?.id || !conversationIdsKey) return undefined;

    const ids = conversationIdsKey.split(',').filter(Boolean);
    const unsubs = ids.map((conversationId) => subscribeToConversation(conversationId, (payload) => {
      if (payload?.event === 'message:new' && payload.message) {
        const msg = payload.message;
        setConversations((prev) => prev.map((c) => {
          if (c.id !== conversationId) return c;
          const unreadCount = getConversationUnread(c, user.id);
          return {
            ...c,
            lastMessage: msg.text,
            lastMessageAt: msg.sentAt,
            unread: {
              ...c.unread,
              [user.id]: msg.senderId === user.id ? 0 : unreadCount + 1,
            },
          };
        }));
        return;
      }

      if (payload?.event === 'conversation:read' && payload.userId === user.id) {
        setConversations((prev) => prev.map((c) => (
          c.id === conversationId
            ? { ...c, unread: { ...c.unread, [user.id]: 0 } }
            : c
        )));
      }
    }));

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [conversationIdsKey, user?.id]);

  return sumUnread(conversations, user?.id);
}
