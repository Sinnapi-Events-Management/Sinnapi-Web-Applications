'use client';
import { useEffect, useRef } from 'react';

/**
 * postgres_changes subscriptions for messaging.
 *
 * This is the delivery path — the one that has to be right. Presence and typing
 * ride on broadcast (see `useConversationChannel`) because they are disposable;
 * a message is not. postgres_changes reads the WAL through the same RLS the
 * table has, so a subscriber is fed exactly the rows a SELECT would have given
 * them, and a reconnect resyncs rather than silently dropping what it missed.
 * Nothing here decides what the user may see.
 *
 * WHY A DEDICATED HOOK AND NOT `useRealtimeRefresh`
 * The generic hook takes a list of `{table, filter}` and fires one callback for
 * any of them. Messaging needs two different reactions from one subscription:
 * a change to *this thread* should refetch the thread, while a change to *any*
 * conversation should refetch the inbox list and the unread counts. Collapsing
 * those into a single `onChange` means every keystroke-speed message in an open
 * thread also refetches the whole inbox.
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

export type MessagingRealtimeClient = {
  channel: (name: string) => Channel;
  removeChannel: (channel: never) => unknown;
};

/**
 * The columns of an arriving `messages` row a subscriber can rely on.
 *
 * A raw WAL record, so it carries no embedded relations — no sender profile, no
 * attachments. Enough to announce that something landed and to route a click at
 * it; never enough to render a bubble from, which is why the refetch handlers
 * exist alongside this.
 */
export type MessageArrivalRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  is_system?: boolean;
};

export type UseMessagingRealtimeOptions = {
  client: MessagingRealtimeClient;
  /** The signed-in profile; the subscription is named after it. */
  currentUserId: string | undefined;
  /** The thread currently on screen, if any. */
  conversationId?: string | null;
  /** A message landed in the open thread. */
  onThreadChange?: () => void;
  /** A message landed anywhere, or a conversation row moved. */
  onInboxChange?: () => void;
  /** The viewer's own participant row changed — read state, mute. */
  onParticipantChange?: () => void;
  /**
   * A message from someone else was inserted anywhere the viewer can see.
   *
   * Separate from `onInboxChange` because it answers a different question: that
   * one fires on edits, deletes and the viewer's own sends, all of which move
   * the inbox and none of which are an *arrival*. Alerting on those would
   * announce your own message back to you.
   */
  onMessageArrived?: (row: MessageArrivalRow) => void;
  enabled?: boolean;
};

export function useMessagingRealtime({
  client,
  currentUserId,
  conversationId,
  onThreadChange,
  onInboxChange,
  onParticipantChange,
  onMessageArrived,
  enabled = true,
}: UseMessagingRealtimeOptions): void {
  // Held in refs so callers passing inline arrows — the normal case — do not
  // tear down and rebuild the websocket on every render.
  const thread = useRef(onThreadChange);
  const inbox = useRef(onInboxChange);
  const participant = useRef(onParticipantChange);
  const arrived = useRef(onMessageArrived);
  thread.current = onThreadChange;
  inbox.current = onInboxChange;
  participant.current = onParticipantChange;
  arrived.current = onMessageArrived;

  useEffect(() => {
    if (!enabled || !currentUserId) return;

    // Named per user rather than per conversation so switching threads does not
    // churn the connection; the open thread is discriminated in the handler.
    const ch = client.channel(`messaging:${currentUserId}`);

    ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages' },
      (payload: {
        eventType?: string;
        new?: Partial<MessageArrivalRow>;
        old?: { conversation_id?: string };
      }) => {
        const affected = payload.new?.conversation_id ?? payload.old?.conversation_id;
        // The inbox always cares: the row's preview, order and unread count all
        // move on any message the viewer is entitled to see.
        inbox.current?.();
        if (conversationId && affected === conversationId) thread.current?.();

        // System messages are the product narrating itself ("Booking
        // confirmed") — the notification feed already covers those, and
        // announcing them here would double up.
        const row = payload.new;
        if (
          payload.eventType === 'INSERT' &&
          row?.id &&
          row.conversation_id &&
          row.sender_id !== currentUserId &&
          !row.is_system
        ) {
          arrived.current?.(row as MessageArrivalRow);
        }
      },
    )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () =>
        inbox.current?.(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
          // Read state and mute are per-viewer, so only our own rows matter.
          // Another participant's last_read_at is not something we display.
          filter: `profile_id=eq.${currentUserId}`,
        },
        () => participant.current?.(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_attachments' },
        // Attachments commit in the same transaction as their message but
        // arrive as separate WAL records, so the bubble can render before its
        // files. Only the open thread shows them.
        () => thread.current?.(),
      );

    ch.subscribe();

    return () => {
      client.removeChannel(ch as never);
    };
  }, [client, currentUserId, conversationId, enabled]);
}
