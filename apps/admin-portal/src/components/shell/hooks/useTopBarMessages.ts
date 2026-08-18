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
 * subscriber: a support thread opened while the operator is working the
 * applications queue still moves the badge.
 *
 * The count already excludes threads the operator merely oversees — an
 * unanswered conversation between a client and a vendor is not a message
 * awaiting *their* reply, and letting those nag would make the badge
 * meaningless within a day. The panel inherits that honesty from the same RPC.
 */
export function useTopBarMessages(): PortalMessagesFeed {
  const navigate = useNavigate();
  const [panelOpened, setPanelOpened] = useState(false);

  const { data: unread = 0 } = useUnreadMessageCount();
  const { conversations, isLoading, error } = useConversationViews({ enabled: panelOpened });
  const alerts = useDesktopNotifications({ storageKey: 'sinnapi.admin.messageAlerts' });

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
        // Tagged by thread, not by message, so a burst from one conversation
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
    audience: 'admin',
    isLoading,
    error,
    onOpen: () => setPanelOpened(true),
    onSelect: (conversationId: string) => navigate(`/messages/${conversationId}`),
    alerts,
  };
}
