'use client';
import { useEffect, useRef } from 'react';

/**
 * Realtime subscription hook, shared by all three portals.
 *
 * Escrow is the case that forced this: a client sits on the booking page while
 * a webhook lands, a cron raises the advance, or an admin approves a release —
 * all of which happen server-side with no request from the browser to hang a
 * refetch off. Polling a money screen is both wasteful and, at any sane
 * interval, still stale at the moment it matters.
 *
 * The Supabase client is duck-typed rather than imported. `@sinnapi/ui` is a
 * pure UI-framework package with no data client of its own, and each portal
 * constructs its client with its own storage key — passing it in keeps that
 * boundary intact.
 */

/**
 * The slice of a Supabase client this hook uses.
 *
 * `on` is typed loosely on purpose. The real `RealtimeChannel.on` is a heavily
 * overloaded signature covering presence, broadcast and postgres_changes, and
 * a precise structural copy of it here would either fail to match or drag the
 * realtime types into a package that has no data-client dependency. The call
 * site below passes a correctly shaped postgres_changes filter; this type only
 * needs to admit it.
 */
type Channel = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on: (...args: any[]) => Channel;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscribe: (...args: any[]) => unknown;
};

export type RealtimeCapableClient = {
  channel: (name: string) => Channel;
  removeChannel: (channel: never) => unknown;
};

export type RealtimeWatch = {
  table: string;
  /** Postgres-changes filter, e.g. `id=eq.<uuid>` or `client_id=eq.<uuid>`. */
  filter?: string;
  /** Defaults to every change. */
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
};

export type UseRealtimeRefreshOptions = {
  client: RealtimeCapableClient;
  /** Unique per subscription; two hooks sharing a name would collide. */
  channel: string;
  watch: RealtimeWatch[];
  /** Called on any matching change — usually a react-query invalidation. */
  onChange: () => void;
  enabled?: boolean;
};

export function useRealtimeRefresh({
  client,
  channel,
  watch,
  onChange,
  enabled = true,
}: UseRealtimeRefreshOptions): void {
  // Held in a ref so a caller passing an inline arrow (the common case) does
  // not tear down and rebuild the websocket subscription on every render.
  const handler = useRef(onChange);
  handler.current = onChange;

  // Same reasoning for the watch list: compare by value, not identity.
  const key = JSON.stringify(watch);

  useEffect(() => {
    if (!enabled || watch.length === 0) return;

    const subscriptions: RealtimeWatch[] = JSON.parse(key);
    let ch = client.channel(channel);

    for (const w of subscriptions) {
      ch = ch.on(
        'postgres_changes',
        {
          event: w.event ?? '*',
          schema: 'public',
          table: w.table,
          ...(w.filter ? { filter: w.filter } : {}),
        },
        () => handler.current(),
      );
    }

    ch.subscribe();

    return () => {
      client.removeChannel(ch as never);
    };
    // `watch` is intentionally absent — `key` is its stable value-equal proxy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, channel, key, enabled]);
}
