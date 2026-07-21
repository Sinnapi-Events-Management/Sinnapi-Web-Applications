import type { StatusTabOption } from '@/components/ui/StatusTabs';

/** Read-state views over the feed. */
export const NOTIFICATION_TABS = ['all', 'unread', 'read'] as const;

export type NotificationTab = (typeof NOTIFICATION_TABS)[number];

export const NOTIFICATION_TAB_DEFS: { value: NotificationTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
];

/**
 * Feed totals. These are server-exact — `all` rides on the feed query's
 * `count: 'exact'` and `unread` on the same head-count the sidebar badge uses —
 * so they describe the whole feed, not just the pages loaded so far.
 */
export type NotificationCounts = Record<NotificationTab, number>;

/** Merge live counts into the static tab defs for <StatusTabs />. */
export function buildNotificationTabs(
  counts: NotificationCounts,
): StatusTabOption<NotificationTab>[] {
  return NOTIFICATION_TAB_DEFS.map((t) => ({ ...t, count: counts[t.value] }));
}

/**
 * Empty-state copy. Distinguishes an empty feed from one a filter emptied, so
 * "you're all caught up" is only ever said when it's actually true.
 */
export function getEmptyState(
  tab: NotificationTab,
  filtered: boolean,
): { title: string; description: string } {
  if (filtered) {
    return {
      title: 'No matching notifications',
      description: 'Try a different category or search term.',
    };
  }
  if (tab === 'unread') {
    return {
      title: "You're all caught up",
      description: 'Every notification has been read. New ones will appear here.',
    };
  }
  if (tab === 'read') {
    return {
      title: 'Nothing read yet',
      description: 'Notifications you have opened or marked read will collect here.',
    };
  }
  return {
    title: 'No notifications yet',
    description: 'Alerts about bookings, quotes, payouts and payments appear here.',
  };
}
