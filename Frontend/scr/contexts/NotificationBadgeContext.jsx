import { createContext, useContext, useCallback } from 'react';
import { useNotificationBadges } from '../hooks/useNotificationBadges';

const NotificationBadgeContext = createContext();

export function NotificationBadgeProvider({ children }) {
  const bag = useNotificationBadges();

  const value = {
    ...bag,
    incrementBadge: useCallback(bag.incrementBadge, []),
    decrementBadge: useCallback(bag.decrementBadge, []),
    clearBadge: useCallback(bag.clearBadge, []),
    clearAllBadges: useCallback(bag.clearAllBadges, []),
    setBadgeCount: useCallback(bag.setBadgeCount, []),
  };

  return (
    <NotificationBadgeContext.Provider value={value}>
      {children}
    </NotificationBadgeContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationBadgeContext);
  if (!context) throw new Error('useNotificationContext must be used within NotificationBadgeProvider');
  return context;
}
