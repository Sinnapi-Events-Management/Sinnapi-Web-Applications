import type { NotificationCounts, NotificationTab } from '../types';

export type NotificationTabOption = {
  value: NotificationTab;
  label: string;
  count: number;
};

const TAB_DEFS: { value: NotificationTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
];

/** Merge live counts into the static tab defs for `<NotificationTabs />`. */
export function buildNotificationTabs(counts: NotificationCounts): NotificationTabOption[] {
  return TAB_DEFS.map((t) => ({ ...t, count: counts[t.value] }));
}

export type NotificationEmptyState = { title: string; description: string };

/**
 * Empty-state copy for the feed.
 *
 * Distinguishes an empty feed from one a filter emptied, so "you're all caught
 * up" is only ever said when it is actually true — telling someone with 200
 * unread notifications that they are caught up because their search matched
 * nothing is worse than saying nothing.
 */
export function getNotificationEmptyState(
  tab: NotificationTab,
  filtered: boolean,
): NotificationEmptyState {
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
    description: 'Updates about your bookings, quotes, payments and messages appear here.',
  };
}
