import { useMemo } from 'react';
import { useInboxFilters, EMPTY_INBOX_COUNTS, type InboxCounts } from '@sinnapi/ui/messaging';
import { useConversationViews } from '@/hooks/messaging/useConversationViews';
import { useMessagingSync } from '@/hooks/messaging/useMessagingSync';

/**
 * Inbox data and filter state for the operator queue.
 *
 * Most of what this used to do now lives elsewhere. The normalisation of
 * embedded relations moved into `useConversationViews` (and, below that, into
 * `get_my_conversations`), and the tab/type/search machinery moved into
 * `useInboxFilters` in `@sinnapi/ui/messaging` so all three portals filter
 * identically. What remains is admin-specific: the KPI tiles above the list
 * need counts the shared hook does not compute.
 */
export function useMessages(conversationId?: string | null) {
  const { conversations, isLoading, error } = useConversationViews();
  const filters = useInboxFilters({ conversations });

  useMessagingSync(conversationId ?? null);

  /**
   * Counts for the summary tiles.
   *
   * `unread` deliberately counts *threads*, not messages: the tile answers
   * "how many conversations need a person", and a single thread with forty
   * unread messages is still one piece of work. Observed threads are excluded
   * by `useConversationViews`, which zeroes their count — a queue that flagged
   * every conversation on the platform as unread would be unusable within a
   * day of launch.
   */
  const counts: InboxCounts = useMemo(
    () =>
      conversations.reduce<InboxCounts>(
        (acc, c) => {
          acc.all += 1;
          if (c.status === 'active') acc.active += 1;
          else if (c.status === 'archived') acc.archived += 1;
          else if (c.status === 'blocked') acc.blocked += 1;
          if (c.unreadCount > 0 && !c.muted) acc.unread += 1;
          return acc;
        },
        { ...EMPTY_INBOX_COUNTS },
      ),
    [conversations],
  );

  return {
    ...filters,
    counts,
    isLoading,
    countsLoading: isLoading,
    error,
  };
}

export type TypeFilter = ReturnType<typeof useMessages>['typeFilter'];
export type SearchState = ReturnType<typeof useMessages>['search'];
