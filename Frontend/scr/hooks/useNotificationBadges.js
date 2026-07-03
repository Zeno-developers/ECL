import { useState, useCallback, useEffect, useRef } from 'react';
import { notificationsAPI } from '../utils/api';

const POLL_INTERVAL = 60_000;       // poll every 60 s
const MIN_FETCH_GAP = 30_000;       // never hit the server more often than every 30 s

const hasAuthToken = () => typeof localStorage !== 'undefined' && Boolean(localStorage.getItem('token'));

export function useNotificationBadges() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const timerRef    = useRef(null);
  const lastFetch   = useRef(0);        // timestamp of last successful request
  const fetchingRef = useRef(false);    // prevent concurrent fetches

  const fetchUnread = useCallback(async ({ force = false } = {}) => {
    if (!hasAuthToken()) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    // Skip if tab is hidden (saves battery + server load)
    if (document.visibilityState === 'hidden' && !force) return;

    // Throttle — never fire sooner than MIN_FETCH_GAP
    const now = Date.now();
    if (!force && now - lastFetch.current < MIN_FETCH_GAP) return;

    // Prevent concurrent in-flight requests
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    lastFetch.current = now;

    try {
      const res = await notificationsAPI.getUserNotifications({ limit: 15 });
      const data = res?.data;
      setUnreadCount(data?.unread_count ?? 0);
      setNotifications(data?.notifications ?? []);
    } catch {
      // silently ignore — user may not be authenticated yet
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Initial load
    fetchUnread({ force: true });

    // Periodic poll — only while tab is visible
    const tick = () => {
      if (document.visibilityState !== 'hidden') fetchUnread();
    };
    timerRef.current = setInterval(tick, POLL_INTERVAL);

    // Re-fetch when tab becomes visible again after being hidden
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchUnread();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Re-fetch on auth change (login / logout in this tab)
    const onAuthChange = () => fetchUnread({ force: true });
    window.addEventListener('auth:tokens-changed', onAuthChange);

    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('auth:tokens-changed', onAuthChange);
    };
  }, [fetchUnread]);

  const markRead = useCallback(async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch {}
  }, []);

  const deleteNotification = useCallback(async (id) => {
    try {
      const target = notifications.find(n => n.id === id);
      await notificationsAPI.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (target && !target.is_read) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  }, [notifications]);

  const refresh = useCallback(() => fetchUnread({ force: true }), [fetchUnread]);

  const badges = { chatUnread: 0, newRegistrations: 0, websiteMessages: 0, announcements: unreadCount, promotions: 0 };

  return {
    badges,
    totalUnread: unreadCount,
    unreadCount,
    notifications,
    markRead,
    markAllRead,
    deleteNotification,
    refresh,
    incrementBadge: () => {},
    decrementBadge: () => {},
    clearBadge: () => {},
    clearAllBadges: () => {},
    setBadgeCount: () => {},
  };
}
