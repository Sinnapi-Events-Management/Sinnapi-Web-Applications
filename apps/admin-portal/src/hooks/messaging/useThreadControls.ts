import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { MESSAGING_KEYS } from '@/hooks/queries';

/**
 * The three writes that act on a conversation rather than on its messages:
 * marking it read, muting it, archiving it.
 *
 * All three go through SECURITY DEFINER RPCs because the browser has no UPDATE
 * policy on `conversation_participants` or `conversations` — deliberately, since
 * those columns decide what other people's inboxes look like.
 */
export function useThreadControls() {
  const qc = useQueryClient();

  // Conversations already stamped this mount. Re-marking a thread the user is
  // simply sitting in would write on every realtime tick.
  const marked = useRef<Set<string>>(new Set());

  const refreshUnread = useCallback(() => {
    void qc.invalidateQueries({ queryKey: MESSAGING_KEYS.unreadTotal });
  }, [qc]);

  /**
   * Called when the newest message is actually on screen — not when the thread
   * mounts. Marking a long thread read because it loaded, while the reader sits
   * at the top of it, is how unread counts stop meaning anything.
   *
   * `signature` is the conversation's newest-message timestamp, and it is what
   * makes the dedupe correct rather than merely cheap. Keyed on the id alone,
   * the first stamp would suppress every later one — so a message arriving in
   * the thread the reader is already sitting in and watching would leave its
   * badge lit forever. Including the timestamp means a new message is a new key,
   * and re-reading the same state still costs nothing.
   */
  const markRead = useCallback(
    (conversationId: string, signature?: string | null) => {
      if (!conversationId) return;
      const key = `${conversationId}|${signature ?? ''}`;
      if (marked.current.has(key)) return;
      marked.current.add(key);

      void supabase
        .rpc('mark_conversation_read', { p_conversation_id: conversationId })
        .then(({ error }) => {
          // A failed stamp is not worth interrupting anyone over — just allow a
          // retry rather than leaving the key in the "already done" set.
          if (error) marked.current.delete(key);
          else refreshUnread();
        });
    },
    [refreshUnread],
  );

  /** Drops every stamp for a conversation, so re-opening it always re-reads. */
  const resetMark = useCallback((conversationId: string) => {
    for (const key of marked.current) {
      if (key.startsWith(`${conversationId}|`)) marked.current.delete(key);
    }
  }, []);

  const setMuted = useCallback(
    async (conversationId: string, muted: boolean) => {
      const { error } = await supabase.rpc('set_conversation_muted', {
        p_conversation_id: conversationId,
        p_muted: muted,
      });
      if (error) throw new Error('Could not update notification settings.');
      refreshUnread();
    },
    [refreshUnread],
  );

  const setArchived = useCallback(
    async (conversationId: string, archived: boolean) => {
      const { error } = await supabase.rpc('set_conversation_status', {
        p_conversation_id: conversationId,
        p_status: archived ? 'archived' : 'active',
      });
      if (error) throw new Error('Could not update this conversation.');
      void qc.invalidateQueries({ queryKey: MESSAGING_KEYS.conversations });
    },
    [qc],
  );

  return { markRead, resetMark, setMuted, setArchived };
}
