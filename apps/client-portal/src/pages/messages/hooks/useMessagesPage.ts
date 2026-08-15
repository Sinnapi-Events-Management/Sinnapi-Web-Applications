import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useInboxFilters } from '@sinnapi/ui/messaging';
import { useConversationViews } from '@/hooks/messaging/useConversationViews';
import { useMessagingSync } from '@/hooks/messaging/useMessagingSync';
import { useThreadControls } from '@/hooks/messaging/useThreadControls';

/**
 * Everything the client inbox needs to decide *what* to render: normalised
 * rows, the filters over them, and which thread is open.
 *
 * THE OPEN THREAD LIVES IN THE URL. `/messages/:conversationId` is the same
 * route the standalone conversation page uses, so a link from a booking, a
 * quotation or a notification lands on the inbox with that thread already
 * selected — rather than on a detached page with no way back to the list. It
 * also survives a refresh and can be shared, which component state cannot.
 */
export function useMessagesPage() {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { conversations, isLoading, error } = useConversationViews();
  const controls = useThreadControls();

  const filters = useInboxFilters({ conversations });

  // Keeps the master column in sync with the URL without a second source of
  // truth for "which thread is open".
  const active = useMemo(
    () => conversations.find((c) => c.id === conversationId) ?? null,
    [conversations, conversationId],
  );

  // A thread reachable by URL but filtered out of the list would render an
  // empty pane beside a list that does not contain it. Widening to "all" is
  // less surprising than silently closing what the user asked for.
  const [forcedOpen, setForcedOpen] = useState(false);
  useEffect(() => {
    if (!conversationId || forcedOpen) return;
    if (conversations.length === 0) return;
    const known = conversations.some((c) => c.id === conversationId);
    const visible = filters.rows.some((c) => c.id === conversationId);
    if (known && !visible) {
      filters.setTab('all');
      setForcedOpen(true);
    }
  }, [conversationId, conversations, filters, forcedOpen]);

  const open = useCallback(
    (id: string) => {
      // `resetMark` so re-opening a thread that has received messages since the
      // last visit stamps the receipt again.
      controls.resetMark(id);
      navigate(`/messages/${id}`);
    },
    [navigate, controls],
  );

  const close = useCallback(() => navigate('/messages'), [navigate]);

  // Subscribes once for the whole inbox, narrowed to the open thread.
  useMessagingSync(conversationId ?? null);

  return {
    ...filters,
    active,
    activeId: conversationId ?? null,
    open,
    close,
    isLoading,
    error,
    isEmpty: !isLoading && conversations.length === 0,
    controls,
  };
}

export type MessagesPageState = ReturnType<typeof useMessagesPage>;
