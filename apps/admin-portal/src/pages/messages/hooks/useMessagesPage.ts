import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMessages } from './useMessages';
import { useActiveConversation } from './useActiveConversation';

/**
 * Composes the inbox's two halves — the filtered list and the open thread —
 * and reconciles the one place they interact.
 *
 * A conversation reachable by URL is not necessarily in the current view: the
 * default tab is "active", so a deep link to an archived thread would select a
 * row the list does not contain, leaving an empty pane beside a list that
 * disagrees with it. Widening to "all" is less surprising than silently
 * refusing to open what the operator explicitly asked for, and it happens once
 * per mount so it never fights a filter they set afterwards.
 */
export function useMessagesPage() {
  // Read here rather than from `useActiveConversation`, because `useMessages`
  // needs the id to scope its realtime subscription and runs before the
  // active-conversation hook has any rows to resolve against.
  const { conversationId = null } = useParams();

  const inbox = useMessages(conversationId);
  const active = useActiveConversation(inbox.rows);

  const [widened, setWidened] = useState(false);
  const { rows, isLoading, setTab } = inbox;

  useEffect(() => {
    if (widened || !conversationId || isLoading) return;
    if (!rows.some((c) => c.id === conversationId)) {
      setTab('all');
      setWidened(true);
    }
  }, [conversationId, rows, isLoading, setTab, widened]);

  return { inbox, active };
}
