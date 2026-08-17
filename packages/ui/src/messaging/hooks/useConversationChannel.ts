'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PresentParticipant } from '../types';

/**
 * Live presence and typing for one conversation.
 *
 * WHY BROADCAST AND PRESENCE, NOT A TABLE
 * Typing is the textbook case for ephemeral transport: it changes several times
 * a second, is worthless a moment later, and writing it to Postgres would put
 * one INSERT per keystroke-burst on the messages hot path — for data that is
 * stale before it commits. Presence is the same argument for "are they here".
 * Message *delivery* stays on postgres_changes, where RLS is the authority and
 * a reconnect replays what was missed; nothing here is trusted for content.
 *
 * AUTHORISATION already exists. `can_access_topic()` (migration 0015) resolves
 * `conversation:{id}` through `is_conversation_participant`, and the
 * `sinnapi_realtime_receive` / `_send` policies on `realtime.messages` enforce
 * it for subscribe and publish alike. A non-participant cannot join this
 * channel, so nothing here re-checks it in the browser — that check would be
 * advisory anyway.
 *
 * ONE CHANNEL, TWO FEATURES. Presence and typing share a single subscription
 * rather than opening one each: connection count is the thing that actually
 * costs, and both are scoped to exactly the same topic and lifetime.
 *
 * The Supabase client is duck-typed and injected, for the same reason
 * `useRealtimeRefresh` does it — `@sinnapi/ui` carries no data client, and each
 * portal builds its own with its own storage key.
 */

type PresenceState = Record<string, Array<Record<string, unknown>>>;

type PresenceChannel = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on: (...args: any[]) => PresenceChannel;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscribe: (cb?: (status: string) => void | Promise<void>) => any;
  presenceState: () => PresenceState;
  track: (payload: Record<string, unknown>) => Promise<unknown>;
  untrack: () => Promise<unknown>;
  // `type` is the literal union the real client declares, not `string` — the
  // parameter is contravariant, so widening it here stops `SupabaseClient` from
  // satisfying this shape.
  send: (args: {
    type: 'broadcast' | 'presence' | 'postgres_changes';
    event: string;
    payload?: unknown;
  }) => Promise<unknown> | unknown;
};

export type PresenceCapableClient = {
  // `config` is required rather than optional so this stays assignable from
  // Supabase's own `RealtimeChannelOptions`. Under `strictFunctionTypes` the
  // parameter is contravariant, and a looser `Record<string, unknown>` here
  // makes the real client fail to match.
  channel: (name: string, opts?: { config: Record<string, unknown> }) => PresenceChannel;
  removeChannel: (channel: never) => unknown;
};

export type UseConversationChannelOptions = {
  client: PresenceCapableClient;
  conversationId: string | null | undefined;
  /** The viewer, so their own presence and typing are filtered out. */
  currentUserId: string | undefined;
  /** Shown by the header as "<name> is typing"; falls back to "Someone". */
  displayName?: string | null;
  enabled?: boolean;
};

/** A peer's typing state expires this long after their last ping. */
const TYPING_TTL_MS = 4000;

/**
 * Teardowns still in flight, by topic.
 *
 * `removeChannel()` is asynchronous — it awaits the server's reply to the leave
 * before the client lets go of the channel — but an effect cleanup is
 * synchronous and returns long before that. In the gap,
 * `client.channel(topic)` resolves to the *departing* channel rather than a new
 * one, and `RealtimeChannel.on()` throws `cannot add \`presence\` callbacks …
 * after \`subscribe()\`` on anything already joined. So a re-run of the effect
 * has to wait for the previous run to actually be gone.
 *
 * `useMessagingRealtime` solves the same collision by giving every subscription
 * a unique topic, which is not available here: presence and typing only work
 * when both parties are on one topic, and `can_access_topic` (migration 0015)
 * authorises this one by name. Waiting is the alternative.
 *
 * Keyed by topic rather than held as one global promise — two different
 * conversations have no reason to queue behind each other.
 */
const leaving = new Map<string, Promise<unknown>>();

export function useConversationChannel({
  client,
  conversationId,
  currentUserId,
  displayName,
  enabled = true,
}: UseConversationChannelOptions) {
  const [peers, setPeers] = useState<PresentParticipant[]>([]);
  const [typingNames, setTypingNames] = useState<string[]>([]);

  // profile_id → { name, expiresAt }. Held in a ref because the sweep below
  // reads it on an interval and must not re-arm that interval on every ping.
  const typing = useRef<Map<string, { name: string; expiresAt: number }>>(new Map());
  const channelRef = useRef<PresenceChannel | null>(null);
  const nameRef = useRef(displayName);
  nameRef.current = displayName;

  const active = enabled && !!conversationId && !!currentUserId;

  useEffect(() => {
    if (!active) {
      setPeers([]);
      setTypingNames([]);
      typing.current.clear();
      return;
    }

    // Captured once so the cleanup below clears the same Map this run
    // populated, rather than whatever `typing.current` points at by then.
    const typingNow = typing.current;
    const topic = `conversation:${conversationId}`;

    // Set by the cleanup, read by the deferred open — a run torn down while it
    // is still waiting for the previous channel to leave must not then join.
    let cancelled = false;
    let ch: PresenceChannel | null = null;
    let sweep: ReturnType<typeof setInterval> | undefined;

    // A rejected teardown is still a finished one, so failure resolves the wait
    // rather than propagating and stranding the topic permanently unopenable.
    const opened = (leaving.get(topic) ?? Promise.resolve())
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;

        // `key` makes presence self-identifying, so a user open in two tabs
        // collapses to one entry instead of appearing twice in the header.
        const channel = client.channel(topic, { config: { presence: { key: currentUserId } } });
        ch = channel;
        channelRef.current = channel;

        const syncPresence = () => {
          const state = channel.presenceState();
          setPeers(
            Object.keys(state)
              .filter((id) => id !== currentUserId)
              .map((id) => ({ profileId: id, typing: typing.current.has(id) })),
          );
        };

        channel
          .on('presence', { event: 'sync' }, syncPresence)
          .on('presence', { event: 'join' }, syncPresence)
          .on('presence', { event: 'leave' }, syncPresence)
          .on('broadcast', { event: 'typing' }, (msg: { payload?: Record<string, unknown> }) => {
            const senderId = msg.payload?.profileId as string | undefined;
            const isTyping = msg.payload?.typing as boolean | undefined;
            // Echoes of our own broadcast are not somebody else typing.
            if (!senderId || senderId === currentUserId) return;

            if (isTyping) {
              typing.current.set(senderId, {
                name: (msg.payload?.name as string) || 'Someone',
                expiresAt: Date.now() + TYPING_TTL_MS,
              });
            } else {
              typing.current.delete(senderId);
            }
            setTypingNames([...typing.current.values()].map((t) => t.name));
          });

        channel.subscribe((status: string) => {
          if (status !== 'SUBSCRIBED') return;
          void channel.track({ profileId: currentUserId, at: new Date().toISOString() });
        });

        // A peer who closes the tab mid-sentence never sends the `false`. Without
        // this sweep their "typing…" would sit in the header forever.
        sweep = setInterval(() => {
          const now = Date.now();
          let changed = false;
          for (const [id, entry] of typing.current) {
            if (entry.expiresAt <= now) {
              typing.current.delete(id);
              changed = true;
            }
          }
          if (changed) setTypingNames([...typing.current.values()].map((t) => t.name));
        }, 1000);
      });

    return () => {
      cancelled = true;
      typingNow.clear();
      channelRef.current = null;

      // Chained off `opened` rather than run now: when the open is still
      // pending there is nothing yet to leave, and tearing down out of order
      // would let it join after this run was supposed to have ended.
      const done = opened.then(() => {
        if (sweep) clearInterval(sweep);
        if (!ch) return;
        void ch.untrack();
        return client.removeChannel(ch as never);
      });

      // What the next run for this topic waits on. Cleared only if it is still
      // the newest teardown, so a later one is never dropped by an earlier
      // one's completion.
      leaving.set(topic, done);
      void done.then(
        () => {
          if (leaving.get(topic) === done) leaving.delete(topic);
        },
        () => {
          if (leaving.get(topic) === done) leaving.delete(topic);
        },
      );
    };
  }, [client, conversationId, currentUserId, active]);

  /**
   * Broadcasts the viewer's typing state. Throttling is the composer's job —
   * it knows about keystrokes; this only knows about the wire.
   */
  const setTyping = useCallback(
    (isTyping: boolean) => {
      const ch = channelRef.current;
      if (!ch || !currentUserId) return;
      void ch.send({
        type: 'broadcast',
        event: 'typing',
        payload: { profileId: currentUserId, typing: isTyping, name: nameRef.current || 'Someone' },
      });
    },
    [currentUserId],
  );

  const onlineIds = useMemo(() => new Set(peers.map((p) => p.profileId)), [peers]);

  return {
    /** Everyone else currently on this conversation's channel. */
    peers,
    onlineIds,
    /** True when any counterparty is present — drives the header's dot. */
    counterpartyOnline: peers.length > 0,
    typingNames,
    setTyping,
  };
}
