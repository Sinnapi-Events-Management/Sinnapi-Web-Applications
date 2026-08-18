import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MENU_PREVIEW_LIMIT, type PortalNotificationsFeed } from '@sinnapi/ui/router';
import { toNotificationView, type NotificationView } from '@sinnapi/ui/notifications';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useRecentNotifications,
  useUnreadCount,
} from '@/hooks/queries';
import { useAdmin } from '@/admin/AdminProvider';
import { resolveDomain } from '@/pages/notifications/schema';

/**
 * Everything behind the top bar's bell.
 *
 * Same contract as the message centre — cheap count always, rows on first open
 * — so the two panels behave identically without sharing an implementation
 * they have no business sharing.
 *
 * Where a row leads is the one thing admin does differently. The other portals
 * resolve a per-record path; this one has section-level routes gated by
 * permission (`/disputes` needs `dispute.manage`), so an operator who cannot
 * open the section lands on the feed instead of on a page that would bounce
 * them. The feed itself is always readable.
 */
export function useTopBarNotifications(): PortalNotificationsFeed {
  const navigate = useNavigate();
  const { has } = useAdmin();
  const [panelOpened, setPanelOpened] = useState(false);

  const { data: unread = 0 } = useUnreadCount();
  const {
    data: rows = [],
    isLoading,
    error,
  } = useRecentNotifications(MENU_PREVIEW_LIMIT, { enabled: panelOpened });

  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const notifications = useMemo(() => rows.map(toNotificationView), [rows]);

  const onSelect = (notification: NotificationView) => {
    if (notification.unread) markRead.mutate(notification.id);

    const { route, perm } = resolveDomain(notification.triggerKey);
    const allowed = route && (!perm || has(perm));
    navigate(allowed ? route : '/notifications');
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
