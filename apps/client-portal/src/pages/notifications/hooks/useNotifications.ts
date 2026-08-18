import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  toNotificationView,
  useNotificationFeed,
  type NotificationCounts,
  type NotificationTarget,
  type NotificationView,
} from '@sinnapi/ui/notifications';
import { useNotifications as useNotificationsQuery, useUnreadCount } from '@/hooks/queries';
import { useNotificationSync } from './useNotificationSync';
import { useNotificationActions } from './useNotificationActions';
import { useActiveNotification } from './useActiveNotification';

/**
 * The notification centre, assembled.
 *
 * Composition rather than implementation: paging comes from the query layer,
 * filtering and selection from the shared kit, writes from
 * `useNotificationActions`, liveness from `useNotificationSync`, and the open
 * row from `useActiveNotification`. This hook's own job is the small amount of
 * glue none of them can own alone — turning rows into views, reconciling the
 * two count sources, and making sure an action taken on the open row is
 * reflected in both the feed and the pane.
 *
 * Counts come from the server (the feed query's exact count and the shared
 * unread head-count) rather than from the loaded pages, so the tiles and tab
 * badges describe the whole feed even when only the first page is in hand. The
 * *list* is filtered client-side over what is loaded — which is why the toolbar
 * reports "N shown" and Load more stays available underneath.
 */
export function useNotifications() {
  const navigate = useNavigate();
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useNotificationsQuery();
  const { data: unreadCount = 0, isLoading: unreadLoading } = useUnreadCount();

  const all = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.rows).map(toNotificationView),
    [data?.pages],
  );
  const total = data?.pages[0]?.total ?? 0;

  const counts: NotificationCounts = useMemo(
    // `read` is derived rather than counted: one fewer round trip, and it can't
    // disagree with the two exact figures it is built from. Clamped because the
    // two counts are separate requests and can briefly straddle a new arrival.
    () => ({ all: total, unread: unreadCount, read: Math.max(0, total - unreadCount) }),
    [total, unreadCount],
  );

  const feed = useNotificationFeed(all);
  const sync = useNotificationSync();
  const actions = useNotificationActions();
  const active = useActiveNotification();

  const { clear: clearSelection } = feed.selection;
  const { markRead, markUnread: markUnreadIds } = actions;
  const { markOpenUnread } = active;

  // Bulk actions clear their own selection: the rows they acted on are about to
  // change read state, and under the Unread tab most of them will leave the
  // list entirely. Leaving them ticked would describe a set that is no longer
  // on screen.
  const markSelectedRead = useCallback(
    (ids: string[]) => {
      markRead(ids);
      clearSelection();
    },
    [markRead, clearSelection],
  );

  const markSelectedUnread = useCallback(
    (ids: string[]) => {
      markUnreadIds(ids);
      ids.forEach(markOpenUnread);
      clearSelection();
    },
    [markUnreadIds, markOpenUnread, clearSelection],
  );

  // The row menu and the pane both offer this; both must keep the open
  // snapshot in step, or the pane would keep claiming a row is read.
  const toggleRead = useCallback(
    (notification: NotificationView) => {
      actions.toggleRead(notification);
      if (!notification.unread) markOpenUnread(notification.id);
    },
    [actions, markOpenUnread],
  );

  const openTarget = useCallback((target: NotificationTarget) => navigate(target.path), [navigate]);

  return {
    feed,
    counts,
    isLoading,
    countsLoading: isLoading || unreadLoading,
    error,
    paging: {
      loaded: all.length,
      total,
      hasMore: !!hasNextPage,
      loadingMore: isFetchingNextPage,
      loadMore: () => void fetchNextPage(),
    },
    arrivals: sync.arrivals,
    alerts: sync.alerts,
    chime: sync.chime,
    active,
    actions,
    markSelectedRead,
    markSelectedUnread,
    toggleRead,
    openTarget,
  };
}
