import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ConversationView } from './useMessages';

/**
 * UI state for the master–detail inbox: which conversation is open in the thread
 * pane, plus the read receipt that follows from opening it.
 *
 * Kept separate from `useMessages` so the list's data/filter logic stays free of
 * presentation state. Opening a thread stamps `last_read_at` through the
 * SECURITY DEFINER `mark_conversation_read` RPC (the browser has no UPDATE
 * policy on `conversation_participants`), then refreshes the read-state query so
 * the unread badge clears. Each conversation is stamped at most once per mount —
 * re-opening an already-read thread writes nothing.
 */
export function useActiveConversation(rows: ConversationView[]) {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const marked = useRef<Set<string>>(new Set());

  const active = useMemo(() => rows.find((c) => c.id === activeId) ?? null, [rows, activeId]);

  // Never leave the thread pane pointing at a row that has been filtered away.
  useEffect(() => {
    if (activeId && !rows.some((c) => c.id === activeId)) setActiveId(null);
  }, [rows, activeId]);

  useEffect(() => {
    if (!active?.unread || marked.current.has(active.id)) return;
    const id = active.id;
    marked.current.add(id);
    let cancelled = false;
    void supabase.rpc('mark_conversation_read', { p_conversation_id: id }).then(({ error }) => {
      if (cancelled) return;
      // A failed stamp is not worth interrupting the admin — just allow a retry
      // on the next open rather than leaving the id in the "already done" set.
      if (error) marked.current.delete(id);
      else qc.invalidateQueries({ queryKey: ['conversation-read-state'] });
    });
    return () => {
      cancelled = true;
    };
  }, [active, qc]);

  const open = useCallback((id: string) => setActiveId(id), []);
  const close = useCallback(() => setActiveId(null), []);
  const isOpen = useCallback((id: string) => id === activeId, [activeId]);

  return { activeId, active, open, close, isOpen };
}

export type ActiveConversationState = ReturnType<typeof useActiveConversation>;
