import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getAccessToken } from '../services/api/tokenStorage.js';
import { getNotifications } from '../services/notificationService.js';
import {
  NOTIFICATIONS_REFRESH_EVENT,
  subscribeToNotifications,
} from '../services/notificationRealtime.js';
import { toast } from 'sonner';

function sortNotifications(notifications) {
  return [...notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function useNotifications({ pollIntervalMs = 20_000, enabled = true } = {}) {
  const { user, bootstrapping } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const refreshRef = useRef(null);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (bootstrapping || !user?.id || !getAccessToken() || !enabled) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return null;
    }

    if (!silent) setLoading(true);
    setError(null);

    try {
      const { notifications: items, unreadCount: count } = await getNotifications(user.id);
      const list = Array.isArray(items) ? items : [];
      setNotifications(list);
      setUnreadCount(Number.isFinite(count) ? count : list.filter((n) => !n.read).length);
      return { notifications: list, unreadCount: count };
    } catch (err) {
      setError(err);
      if (!silent) {
        setNotifications([]);
        setUnreadCount(0);
      }
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user?.id, bootstrapping, enabled]);

  // eslint-disable-next-line react-hooks/refs
  refreshRef.current = refresh;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (bootstrapping || !user?.id || !getAccessToken() || !enabled) return undefined;

    const onRefresh = () => { refreshRef.current?.({ silent: true }); };
    const onFocus = () => { refreshRef.current?.({ silent: true }); };

    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
    window.addEventListener('focus', onFocus);

    let interval = null;
    const startPolling = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(() => refreshRef.current?.({ silent: true }), pollIntervalMs);
    };
    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshRef.current?.({ silent: true });
        startPolling();
      } else {
        stopPolling();
      }
    };

    handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);

    const unsubRealtime = subscribeToNotifications(user.id, (payload) => {
      if (!payload?.event) return;

      if (payload.event === 'notification:new') {
        setNotifications((prev) => {
          const exists = prev.some((n) => n.id === payload.id);
          if (exists) {
            return prev.map((n) => (n.id === payload.id ? { ...n, ...payload } : n));
          }
          setUnreadCount((count) => count + 1);
          if (document.visibilityState === 'visible') {
            toast(payload.title || 'Notification', {
              description: payload.body || payload.message || '',
            });
          }
          return sortNotifications([payload, ...prev]);
        });
        return;
      }

      if (payload.event === 'notification:read' && payload.id) {
        setNotifications((prev) => {
          const target = prev.find((n) => n.id === payload.id);
          if (target && !target.read) {
            setUnreadCount((count) => Math.max(0, count - 1));
          }
          return prev.map((n) => (
            n.id === payload.id ? { ...n, ...payload, read: true } : n
          ));
        });
        return;
      }

      if (payload.event === 'notifications:read-all') {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    });

    return () => {
      window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      stopPolling();
      unsubRealtime();
    };
  }, [user?.id, bootstrapping, enabled, pollIntervalMs]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    setNotifications,
    setUnreadCount,
  };
}

export function getNotificationImageUrl(notification) {
  if (!notification) return null;
  return notification.imageUrl
    || notification.thumbnailUrl
    || notification.previewUrl
    || notification.metadata?.imageUrl
    || notification.metadata?.thumbnailUrl
    || notification.metadata?.previewUrl
    || null;
}
