import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMessagingRealtime, type MessageArrivalRow } from '@sinnapi/ui/messaging';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';
import { MESSAGING_KEYS } from '@/hooks/queries';

export type MessagingSyncOptions = {
  /**
   * A message from someone else landed. Only the shell passes this — it is the
   * one subscriber mounted on every page, so it is the only one that can
   * announce an arrival exactly once.
   */
  onMessageArrived?: (row: MessageArrivalRow) => void;
};

/**
 * Keeps the inbox and the open thread live.
 *
 * The subscription streams postgres_changes, and every handler does exactly one
 * thing: invalidate the react-query key that owns the affected data. Patching
 * the cache directly from a realtime payload is tempting and wrong — the
 * payload is a raw table row with no embedded `vendors` or `message_attachments`
 * relation, so it cannot produce the shape the queries return, and a
 * hand-merged half-row is worse than a refetch.
 *
 * RLS is what makes this safe: postgres_changes evaluates the same policies a
 * SELECT would, so a client is only ever woken by rows they can already read.
 */
export function useMessagingSync(
  conversationId?: string | null,
  { onMessageArrived }: MessagingSyncOptions = {},
) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const refreshInbox = useCallback(() => {
    void qc.invalidateQueries({ queryKey: MESSAGING_KEYS.conversations });
    void qc.invalidateQueries({ queryKey: MESSAGING_KEYS.unreadTotal });
  }, [qc]);

  const refreshThread = useCallback(() => {
    if (!conversationId) return;
    void qc.invalidateQueries({ queryKey: MESSAGING_KEYS.thread(conversationId) });
  }, [qc, conversationId]);

  // Read state and mute live on the participant row, so a change there moves
  // the badges but never the thread.
  const refreshReadState = useCallback(() => {
    void qc.invalidateQueries({ queryKey: MESSAGING_KEYS.unreadTotal });
  }, [qc]);

  useMessagingRealtime({
    client: supabase,
    currentUserId: user?.id,
    conversationId,
    onInboxChange: refreshInbox,
    onThreadChange: refreshThread,
    onParticipantChange: refreshReadState,
    onMessageArrived,
  });
}
