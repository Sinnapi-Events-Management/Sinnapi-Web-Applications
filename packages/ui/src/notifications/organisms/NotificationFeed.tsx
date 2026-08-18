'use client';
import { Stack, Box, Alert } from '@mui/material';
import { NotificationRow } from '../molecules/NotificationRow';
import { NotificationRowSkeleton } from '../molecules/NotificationRowSkeleton';
import { DayGroupHeader } from '../molecules/DayGroupHeader';
import { NewArrivalsPill } from '../molecules/NewArrivalsPill';
import { NotificationLoadMore } from '../molecules/NotificationLoadMore';
import { NotificationEmpty } from '../molecules/NotificationEmpty';
import { NotificationSelectionBar } from './NotificationSelectionBar';
import { getNotificationEmptyState } from '../schema/tabs';
import type { NotificationSelection } from '../hooks/useNotificationFeed';
import type {
  NotificationDayGroup,
  NotificationPaging,
  NotificationTab,
  NotificationTarget,
  NotificationTargetResolver,
  NotificationView,
} from '../types';

export type NotificationFeedProps = {
  groups: NotificationDayGroup[];
  isLoading: boolean;
  error: unknown;
  tab: NotificationTab;
  /** True when filters emptied the list, rather than the feed being empty. */
  isFiltered: boolean;
  paging: NotificationPaging;
  selection: NotificationSelection;
  /** Buffered realtime arrivals waiting to be folded in. */
  arrivals: { count: number; apply: () => void };
  /** The row open in the detail pane, if any. */
  activeId: string | null;
  onOpen: (notification: NotificationView) => void;
  onToggleRead: (notification: NotificationView) => void;
  onMarkRead: (ids: string[]) => void;
  onMarkUnread: (ids: string[]) => void;
  resolveTarget: NotificationTargetResolver;
  onOpenTarget: (target: NotificationTarget) => void;
  /** A read-state write is in flight; row and bulk actions are held. */
  busy?: boolean;
};

/**
 * The master column: the day-grouped feed and every state it can be in.
 *
 * Composition only — it owns nothing. Filters, selection, paging and the
 * arrivals buffer all arrive as props, which is what lets the client and vendor
 * portals render the same column while fetching through their own clients.
 *
 * The arrivals pill and the selection bar both sit above the list and both
 * stick, in that order: an arrival is news about the feed, a selection is a
 * pending action on it, and the action must never be scrolled out of reach
 * while its rows are still selected.
 */
export function NotificationFeed({
  groups,
  isLoading,
  error,
  tab,
  isFiltered,
  paging,
  selection,
  arrivals,
  activeId,
  onOpen,
  onToggleRead,
  onMarkRead,
  onMarkUnread,
  resolveTarget,
  onOpenTarget,
  busy,
}: NotificationFeedProps) {
  if (isLoading) {
    return (
      <Stack spacing={1.25}>
        {Array.from({ length: 6 }).map((_, i) => (
          <NotificationRowSkeleton key={i} />
        ))}
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {error instanceof Error ? error.message : 'Something went wrong loading notifications.'}
      </Alert>
    );
  }

  const empty = getNotificationEmptyState(tab, isFiltered);

  return (
    <Stack spacing={1.25}>
      <NewArrivalsPill count={arrivals.count} onApply={arrivals.apply} />

      <NotificationSelectionBar
        selection={selection}
        onMarkRead={onMarkRead}
        onMarkUnread={onMarkUnread}
        busy={busy}
      />

      {groups.length === 0 ? (
        // Load more stays available on an empty view: under a filter the
        // matches may simply live in pages that have not been fetched yet.
        <NotificationEmpty {...empty} filtered={isFiltered} />
      ) : (
        groups.map((group) => (
          <Box key={group.key}>
            <DayGroupHeader label={group.label} count={group.items.length} />
            <Stack spacing={1.25} sx={{ mt: 0.5 }}>
              {group.items.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  active={n.id === activeId}
                  onOpen={onOpen}
                  selected={selection.isSelected(n.id)}
                  onToggleSelected={selection.toggle}
                  selectionActive={selection.active}
                  onToggleRead={onToggleRead}
                  target={resolveTarget(n)}
                  onOpenTarget={onOpenTarget}
                />
              ))}
            </Stack>
          </Box>
        ))
      )}

      <NotificationLoadMore paging={paging} />
    </Stack>
  );
}
