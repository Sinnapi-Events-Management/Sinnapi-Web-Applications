import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { MESSAGING_KEYS } from '@/hooks/queries';

/**
 * Enrols the operator as a participant so they can reply.
 *
 * WHY THIS STEP EXISTS AT ALL
 * `convo_read` lets `moderation.manage` see every thread, but `messages_insert`
 * requires the sender to be a *participant*. A support conversation the client
 * opened has exactly one participant — the client — so the first operator to
 * pick it up could read it and not answer it. That is the gap
 * `get_or_create_client_admin_conversation` closed inline for the
 * admin-initiated case, and the reason 0815b added `join_support_conversation`
 * for the self-service ones.
 *
 * It is a deliberate step rather than something the pane does on mount.
 * Enrolment is visible to the other party and permanent, and an operator
 * skimming the queue should not silently join every thread they glance at.
 *
 * Restricted server-side to `client_admin` / `vendor_admin`. A moderator
 * inserting themselves into a private client↔vendor negotiation is a different
 * and much larger decision than answering a question addressed to Sinnapi.
 */
export function useJoinSupportThread() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const join = useCallback(
    async (conversationId: string) => {
      if (!conversationId || busyId) return false;
      setBusyId(conversationId);
      setError(null);

      const { error: rpcError } = await supabase.rpc('join_support_conversation', {
        p_conversation_id: conversationId,
      });

      setBusyId(null);

      if (rpcError) {
        setError(
          rpcError.message.includes('not_a_support_thread')
            ? 'Only Sinnapi support threads can be joined.'
            : 'Could not join this conversation. Please try again.',
        );
        return false;
      }

      // The row's `is_observer` flips, which is what swaps the join prompt for
      // a composer.
      void qc.invalidateQueries({ queryKey: MESSAGING_KEYS.conversations });
      return true;
    },
    [busyId, qc],
  );

  return {
    join,
    isJoining: (id: string) => busyId === id,
    error,
    clearError: () => setError(null),
  };
}
