import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PortalMessagesFeed } from '@sinnapi/ui/router';
import { useDesktopNotifications } from '@sinnapi/ui/notifications';
import type { MessageArrivalRow } from '@sinnapi/ui/messaging';
import { useUnreadMessageCount } from '@/hooks/queries';
import { useConversationViews } from '@/hooks/messaging/useConversationViews';
import { useMessagingSync } from '@/hooks/messaging/useMessagingSync';

/**
 * Everything behind the top bar's message centre.
 *
 * Mounted by the shell, so it is the portal's single always-on messaging
 * subscriber: a message arriving while the client is on their bookings still
 * moves the badge, and still raises a desktop alert if they asked for one.
 *
 * The two reads are split on purpose. The unread count is a head-count RPC
 * every page can afford; the conversation list is only fetched once the panel
 * is opened, and stays live from then on through the same realtime
 * invalidation the inbox uses. Most sessions never open it, and a preview
 * nobody looks at is not worth a request on every page view.
 */
export function useTopBarMessages(): PortalMessagesFeed {
  const navigate = useNavigate();
  const [panelOpened, setPanelOpened] = useState(false);

  const { data: unread = 0 } = useUnreadMessageCount();
  const { conversations, isLoading, error } = useConversationViews({ enabled: panelOpened });
  const alerts = useDesktopNotifications({ storageKey: 'sinnapi.client.messageAlerts' });

  // Read inside a subscription callback, so it is held in a ref rather than
  // closed over — the alert must see the newest titles, not the ones that
  // existed when the subscription was set up.
  const titles = useMemo(() => new Map(conversations.map((c) => [c.id, c.title])), [conversations]);
  const titlesRef = useRef(titles);
  titlesRef.current = titles;

  const onMessageArrived = useCallback(
    (row: MessageArrivalRow) => {
      alerts.notify({
        // Falls back rather than waiting: the panel may never have been opened,
        // in which case no conversation list exists to name the sender from.
        title: titlesRef.current.get(row.conversation_id) ?? 'New message',
        body: row.body ?? 'Sent an attachment',
        // Tagged by thread, not by message, so a burst from one person
        // collapses into a single alert instead of a column of them.
        tag: `conversation:${row.conversation_id}`,
        onClick: () => navigate(`/messages/${row.conversation_id}`),
      });
    },
    [alerts, navigate],
  );

  useMessagingSync(null, { onMessageArrived });

  return {
    to: '/messages',
    unread,
    conversations,
    audience: 'client',
    isLoading,
    error,
    onOpen: () => setPanelOpened(true),
    onSelect: (conversationId: string) => navigate(`/messages/${conversationId}`),
    alerts,
  };
}
