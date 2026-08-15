import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useThreadControls } from '@/hooks/messaging/useThreadControls';
import type { AdminConversationView } from '@/hooks/messaging/useConversationViews';

/**
 * Which conversation is open in the thread pane.
 *
 * THE OPEN THREAD LIVES IN THE URL now, rather than in component state. The
 * pane already linked out to `/messages/:id` for a "full view" that rendered a
 * different, thinner page; routing the selection instead means that link is the
 * same inbox with the thread selected, deep links from a report or an
 * escalation land somewhere useful, and the selection survives a refresh.
 *
 * Marking read moved to `useThreadControls`, fired when the newest message is
 * actually on screen rather than when the pane mounts — see `MessageThread`'s
 * `onReachBottom`. Stamping a thread read because it loaded, while the operator
 * sits at the top of a long history, is how an unread queue stops meaning
 * anything.
 */
export function useActiveConversation(rows: AdminConversationView[]) {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const controls = useThreadControls();

  const active = useMemo(
    () => rows.find((c) => c.id === conversationId) ?? null,
    [rows, conversationId],
  );

  const open = useCallback(
    (id: string) => {
      // Re-arms the read stamp, so re-opening a thread that has moved on since
      // the last visit records the new read point.
      controls.resetMark(id);
      navigate(`/messages/${id}`);
    },
    [navigate, controls],
  );

  const close = useCallback(() => navigate('/messages'), [navigate]);

  return {
    activeId: conversationId ?? null,
    active,
    open,
    close,
    isOpen: useCallback((id: string) => id === conversationId, [conversationId]),
  };
}

export type ActiveConversationState = ReturnType<typeof useActiveConversation>;
