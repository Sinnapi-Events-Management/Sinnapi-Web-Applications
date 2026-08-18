'use client';
import { useEffect, useRef } from 'react';

/**
 * postgres_changes subscription for one recipient's notification feed.
 *
 * WHY A DEDICATED HOOK AND NOT `useRealtimeRefresh`
 * The generic hook collapses every watched table into a single `onChange`, which
 * is the right shape for "something moved, refetch". A notification feed needs
 * more than that: an INSERT must be *buffered* rather than folded in (rows
 * must not shift under a reader mid-scroll) and it must carry its row so the
 * arrival can be announced without waiting on a refetch, while an UPDATE — a
 * read receipt, usually from another tab — should invalidate immediately
 * because it moves no rows.
 *
 * RLS is what makes this safe: postgres_changes evaluates the same policies a
 * SELECT would, so a subscriber is only ever woken by rows they can already
 * read. The `recipient_id` filter is a bandwidth optimisation on top of that,
 * not the security boundary.
 *
 * The Supabase client is duck-typed and injected — `@sinnapi/ui` holds no data
 * client, and each portal builds its own with its own storage key.
 */

type Channel = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on: (...args: any[]) => Channel;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscribe: (...args: any[]) => unknown;
};

export type NotificationsRealtimeClient = {
  channel: (name: string) => Channel;
  removeChannel: (channel: never) => unknown;
};

/**
 * The raw table row a postgres_changes payload carries.
 *
 * `data` is included because the payload is the whole row and this is the only
 * copy of it an arrival has: an alert clicked from another window has to route
 * to the booking or quote the notification is *about*, and that id lives
 * nowhere else until the feed refetches. Optional rather than required so a
 * replication setup configured with a reduced REPLICA IDENTITY still type-checks
 * against the rest of the shape.
 */
export type NotificationRealtimeRow = {
  id: string;
  trigger_key: string;
  title: string | null;
  body: string | null;
  data?: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string | null;
};

export type UseNotificationsRealtimeOptions = {
  client: NotificationsRealtimeClient;
  /** The signed-in profile. The subscription is named and filtered by it. */
  recipientId: string | undefined;
  /** A notification landed. Receives the row, which may be partially populated. */
  onInsert?: (row: NotificationRealtimeRow) => void;
  /** An existing notification changed — read state, in practice. */
  onUpdate?: () => void;
  enabled?: boolean;
};

export function useNotificationsRealtime({
  client,
  recipientId,
  onInsert,
  onUpdate,
  enabled = true,
}: UseNotificationsRealtimeOptions): void {
  // Held in refs so callers passing inline arrows — the normal case — do not
  // tear down and rebuild the websocket on every render.
  const insert = useRef(onInsert);
  const update = useRef(onUpdate);
  insert.current = onInsert;
  update.current = onUpdate;

  useEffect(() => {
    if (!enabled || !recipientId) return;

    const ch = client.channel(`notifications:${recipientId}`);

    ch.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${recipientId}`,
      },
      (payload: { new?: NotificationRealtimeRow }) => {
        if (payload.new) insert.current?.(payload.new);
      },
    ).on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${recipientId}`,
      },
      () => update.current?.(),
    );

    ch.subscribe();

    return () => {
      client.removeChannel(ch as never);
    };
  }, [client, recipientId, enabled]);
}
