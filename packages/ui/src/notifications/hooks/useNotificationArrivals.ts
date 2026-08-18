'use client';
import { useCallback, useRef, useState } from 'react';
import type { NotificationRealtimeRow } from './useNotificationsRealtime';

export type NotificationArrivals = {
  /** How many unseen arrivals are buffered. Drives the "N new" pill. */
  count: number;
  /** The buffered rows, newest last — the order they arrived in. */
  rows: NotificationRealtimeRow[];
  /** Buffer an arrival. Ignores a row already held. */
  record: (row: NotificationRealtimeRow) => void;
  /** Fold the buffer into the feed: runs `onApply`, then empties. */
  apply: () => void;
  /** Empty the buffer without folding it in — for a manual refresh or a filter change. */
  reset: () => void;
};

export type UseNotificationArrivalsOptions = {
  /** Usually a react-query invalidation of the feed key. */
  onApply: () => void;
};

/**
 * The buffer behind the "N new notifications" pill.
 *
 * Arrivals are held rather than merged because a feed that inserts rows at the
 * top while it is being read moves everything under the cursor — the reader
 * loses their place, and a click lands on a different row than the one they
 * aimed at. Deferring the merge behind an explicit control keeps the scroll
 * position stable and makes "new since you looked" a state the user can see
 * instead of one they have to infer.
 *
 * Only the *feed* waits. Unread badges are expected to move on their own, so a
 * caller should still invalidate its count query the moment a row lands.
 *
 * Ids are deduped: an INSERT can be seen twice across a reconnect, and counting
 * it twice would promise rows that do not exist.
 */
export function useNotificationArrivals({
  onApply,
}: UseNotificationArrivalsOptions): NotificationArrivals {
  const [rows, setRows] = useState<NotificationRealtimeRow[]>([]);
  const seen = useRef<Set<string>>(new Set());

  // Held in a ref so a caller passing an inline arrow does not change `record`'s
  // identity on every render — `record` is wired straight into a subscription.
  const apply = useRef(onApply);
  apply.current = onApply;

  const record = useCallback((row: NotificationRealtimeRow) => {
    if (seen.current.has(row.id)) return;
    seen.current.add(row.id);
    setRows((prev) => [...prev, row]);
  }, []);

  const reset = useCallback(() => {
    seen.current.clear();
    setRows([]);
  }, []);

  const applyBuffer = useCallback(() => {
    apply.current();
    seen.current.clear();
    setRows([]);
  }, []);

  return { count: rows.length, rows, record, apply: applyBuffer, reset };
}
