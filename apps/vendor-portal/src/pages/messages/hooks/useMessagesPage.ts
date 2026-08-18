import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useInboxFilters } from '@sinnapi/ui/messaging';
import { useConversationViews } from '@/hooks/messaging/useConversationViews';
import { useMessagingSync } from '@/hooks/messaging/useMessagingSync';
import { useThreadControls } from '@/hooks/messaging/useThreadControls';

/**
 * Rows, filters and the open thread for the vendor inbox.
 *
 * The open thread lives in the URL (`/messages/:conversationId`) so a link from
 * a booking or a notification lands on the inbox with that thread selected,
 * rather than on a detached page with no way back to the list.
 */
export function useMessagesPage() {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { conversations, isLoading, error } = useConversationViews();
  const controls = useThreadControls();

  const filters = useInboxFilters({ conversations });

  const active = useMemo(
    () => conversations.find((c) => c.id === conversationId) ?? null,
    [conversations, conversationId],
  );

  // A thread reachable by URL but filtered out of the list would render an
  // empty pane beside a list that does not contain it.
  const [forcedOpen, setForcedOpen] = useState(false);
  useEffect(() => {
    if (!conversationId || forcedOpen || conversations.length === 0) return;
    const known = conversations.some((c) => c.id === conversationId);
    const visible = filters.rows.some((c) => c.id === conversationId);
    if (known && !visible) {
      filters.setTab('all');
      setForcedOpen(true);
    }
  }, [conversationId, conversations, filters, forcedOpen]);

  const open = useCallback(
    (id: string) => {
      controls.resetMark(id);
      navigate(`/messages/${id}`);
    },
    [navigate, controls],
  );

  const close = useCallback(() => navigate('/messages'), [navigate]);

  useMessagingSync(conversationId ?? null);

  return {
    ...filters,
    active,
    activeId: conversationId ?? null,
    open,
    close,
    isLoading,
    error,
    controls,
  };
}
