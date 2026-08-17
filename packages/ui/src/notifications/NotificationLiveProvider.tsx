'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { useNotificationLive, type NotificationLive } from './hooks/useNotificationLive';
import type { UseNotificationLiveOptions } from './hooks/useNotificationLive';

/**
 * The one live notification subscription a portal has, shared with everything
 * that needs to read from it.
 *
 * WHY A CONTEXT AND NOT TWO CALLS TO THE HOOK
 * `postgres_changes` subscriptions are keyed by channel topic, and the topic
 * here is `notifications:<recipient>`. Calling the hook in the shell *and* on
 * the notifications page would open two channels on one topic against the same
 * socket — which either de-duplicates and leaves one consumer deaf, or does not
 * and delivers every arrival twice. Neither is a thing to leave to the client
 * library's discretion. One subscriber, shared.
 *
 * It also settles ownership. The shell needs arrivals for the badge and the
 * alert; the feed needs the *same* buffer for its "N new" pill, so that
 * dismissing it there clears what the shell counted. Two independent buffers
 * would drift the moment a row landed while the page was mounted.
 */
const NotificationLiveContext = createContext<NotificationLive | null>(null);

export type NotificationLiveProviderProps = UseNotificationLiveOptions & {
  children: ReactNode;
};

export function NotificationLiveProvider({ children, ...options }: NotificationLiveProviderProps) {
  const live = useNotificationLive(options);
  return (
    <NotificationLiveContext.Provider value={live}>{children}</NotificationLiveContext.Provider>
  );
}

/**
 * Read the shared subscription.
 *
 * Throws rather than returning null when the provider is missing: every caller
 * is a notification surface, and a surface that silently renders with no
 * liveness is the exact failure this whole change exists to remove. Failing at
 * mount is how that stays impossible to ship.
 */
export function useNotificationLiveContext(): NotificationLive {
  const value = useContext(NotificationLiveContext);
  if (!value) {
    throw new Error('useNotificationLiveContext must be used inside <NotificationLiveProvider>');
  }
  return value;
}
