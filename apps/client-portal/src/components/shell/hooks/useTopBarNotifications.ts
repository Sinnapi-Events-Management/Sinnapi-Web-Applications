import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MENU_PREVIEW_LIMIT, type PortalNotificationsFeed } from '@sinnapi/ui/router';
import { toNotificationView, type NotificationView } from '@sinnapi/ui/notifications';
import {
  useMarkAllNotificationsRead,
  useRecentNotifications,
  useSetNotificationsRead,
  useUnreadCount,
} from '@/hooks/queries';
import { resolveTarget } from '@/pages/notifications/schema';

/**
 * Everything behind the top bar's bell.
 *
 * Same contract as the message centre — cheap count always, rows on first open
 * — so the two panels behave identically without sharing an implementation
 * they have no business sharing.
 *
 * Opening a row does two things the notification centre also does: it stamps
 * the row read, and it navigates to whatever the notification is *about*
 * rather than to the feed. A bell that only ever lands you on `/notifications`
 * makes you find the same row twice.
 */
export function useTopBarNotifications(): PortalNotificationsFeed {
  const navigate = useNavigate();
  const [panelOpened, setPanelOpened] = useState(false);

  const { data: unread = 0 } = useUnreadCount();
  const {
    data: rows = [],
    isLoading,
    error,
  } = useRecentNotifications(MENU_PREVIEW_LIMIT, { enabled: panelOpened });

  const setRead = useSetNotificationsRead();
  const markAll = useMarkAllNotificationsRead();

  const notifications = useMemo(() => rows.map(toNotificationView), [rows]);

  const onSelect = (notification: NotificationView) => {
    if (notification.unread) setRead.mutate({ ids: [notification.id], read: true });
    // The feed is the fallback, not the failure: a notification the portal
    // surfaces no page for still has a row worth reading in full.
    navigate(resolveTarget(notification)?.path ?? '/notifications');
  };

  return {
    to: '/notifications',
    unread,
    notifications,
    isLoading,
    error,
    onOpen: () => setPanelOpened(true),
    onSelect,
    onMarkAllRead: () => markAll.mutate(),
    markingAll: markAll.isPending,
  };
}
