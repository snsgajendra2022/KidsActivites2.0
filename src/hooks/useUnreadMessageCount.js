import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getConversationsForUser, getTotalUnreadChatCount } from '../services/chatService.js';
import { subscribeToConversation } from '../services/chatRealtime.js';
import {
  getConversationUnread,
  mergeConversations,
  patchConversationUnread,
  sumConversationUnread,
} from '../utils/chatUnread.js';

export const CHAT_UNREAD_REFRESH_EVENT = 'chat:unread-refresh';
export const CHAT_UNREAD_SNAPSHOT_EVENT = 'chat:unread-snapshot';

const CHAT_ROUTE_RE = /\/(messages|chat)(\/|$)/;

let livePageUnread = 0;
let livePageUserId = null;

export function requestChatUnreadRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CHAT_UNREAD_REFRESH_EVENT));
  }
}

/** Push live totals from ChatPage so the sidebar stays in sync. */
export function publishChatUnreadSnapshot(conversations, userId) {
  if (!userId) return;
  livePageUserId = userId;
  livePageUnread = sumConversationUnread(conversations, userId);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHAT_UNREAD_SNAPSHOT_EVENT, {
      detail: { total: livePageUnread, userId },
    }));
  }
}

export function clearChatUnreadSnapshot() {
  livePageUserId = null;
  livePageUnread = 0;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHAT_UNREAD_SNAPSHOT_EVENT, {
      detail: { total: 0, userId: null },
    }));
  }
}

/** Total unread chat messages for the signed-in user (all roles). */
export function useUnreadMessageCount() {
  const { user } = useAuth();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [serverTotal, setServerTotal] = useState(null);
  const [liveTotal, setLiveTotal] = useState(() => (
    livePageUserId && livePageUserId === user?.id ? livePageUnread : 0
  ));
  const onChatRoute = CHAT_ROUTE_RE.test(location.pathname);

  const refresh = useCallback(() => {
    if (!user?.id) {
      setConversations([]);
      setServerTotal(null);
      return Promise.resolve();
    }

    return Promise.all([
      getConversationsForUser(user.id),
      getTotalUnreadChatCount(user.id).catch(() => null),
    ])
      .then(([list, total]) => {
        const items = Array.isArray(list) ? list : [];
        setConversations((prev) => mergeConversations(prev, items, user.id));
        setServerTotal(Number.isFinite(total) ? total : null);
      })
      .catch(() => {
        setConversations([]);
        setServerTotal(null);
      });
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh, location.pathname]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const onRefresh = () => { refresh(); };
    const onSnapshot = (event) => {
      const { total, userId: snapshotUserId } = event.detail || {};
      if (snapshotUserId && snapshotUserId === user.id) {
        setLiveTotal(total ?? 0);
      } else if (!snapshotUserId) {
        setLiveTotal(0);
      }
    };

    window.addEventListener(CHAT_UNREAD_REFRESH_EVENT, onRefresh);
    window.addEventListener(CHAT_UNREAD_SNAPSHOT_EVENT, onSnapshot);
    window.addEventListener('focus', onRefresh);

    if (livePageUserId === user.id) {
      setLiveTotal(livePageUnread);
    }

    const intervalMs = onChatRoute ? 60_000 : 20_000;
    const interval = setInterval(refresh, intervalMs);

    return () => {
      window.removeEventListener(CHAT_UNREAD_REFRESH_EVENT, onRefresh);
      window.removeEventListener(CHAT_UNREAD_SNAPSHOT_EVENT, onSnapshot);
      window.removeEventListener('focus', onRefresh);
      clearInterval(interval);
    };
  }, [user?.id, refresh, onChatRoute]);

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
          const nextUnread = msg.senderId === user.id ? 0 : unreadCount + 1;
          return patchConversationUnread(
            {
              ...c,
              lastMessage: msg.text,
              lastMessageAt: msg.sentAt,
              lastMessageSenderId: msg.senderId,
            },
            user.id,
            nextUnread,
          );
        }));
        setServerTotal(null);
        return;
      }

      if (payload?.event === 'conversation:read' && payload.userId === user.id) {
        setConversations((prev) => prev.map((c) => (
          c.id === conversationId ? patchConversationUnread(c, user.id, 0) : c
        )));
        setServerTotal(null);
      }
    }));

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [conversationIdsKey, user?.id]);

  const fetchedTotal = sumConversationUnread(conversations, user?.id);
  const combined = Math.max(fetchedTotal, liveTotal);
  if (Number.isFinite(serverTotal) && serverTotal > combined) {
    return serverTotal;
  }
  return combined;
}
