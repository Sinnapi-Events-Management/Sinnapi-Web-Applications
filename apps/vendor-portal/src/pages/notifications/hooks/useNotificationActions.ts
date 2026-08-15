import { useCallback } from 'react';
import { useMarkAllNotificationsRead, useSetNotificationsRead } from '@/hooks/queries';
import type { NotificationView } from '@sinnapi/ui/notifications';

/**
 * Every write the notification centre performs, behind one small surface.
 *
 * Read state is a single mutation taking a direction rather than two, because
 * mark-read and mark-unread are the same statement about the same column — one
 * mutation means one invalidation path and no chance of the two drifting.
 * "Mark all" stays separate: it is an RPC over rows the client never loaded, so
 * it cannot be expressed as a list of ids.
 */
export function useNotificationActions() {
  const setRead = useSetNotificationsRead();
  const markAllRead = useMarkAllNotificationsRead();

  const markRead = useCallback((ids: string[]) => setRead.mutate({ ids, read: true }), [setRead]);

  const markUnread = useCallback(
    (ids: string[]) => setRead.mutate({ ids, read: false }),
    [setRead],
  );

  const toggleRead = useCallback(
    (notification: NotificationView) =>
      setRead.mutate({ ids: [notification.id], read: notification.unread }),
    [setRead],
  );

  return {
    markRead,
    markUnread,
    toggleRead,
    markAll: () => markAllRead.mutate(),
    markingAll: markAllRead.isPending,
    /** A read-state write is in flight; row and bulk controls hold. */
    busy: setRead.isPending,
    /** Surfaced by the page as a snackbar — a silent failed write is a lie. */
    error: setRead.error ?? markAllRead.error,
  };
}

export type NotificationActions = ReturnType<typeof useNotificationActions>;
