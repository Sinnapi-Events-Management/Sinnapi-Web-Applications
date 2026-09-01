import { useCallback, useMemo } from 'react';
import type { ConversationView } from '@sinnapi/ui/messaging';
import { useConversationViews } from '@/hooks/messaging/useConversationViews';
import { useMessagingSync } from '@/hooks/messaging/useMessagingSync';
import { useStartConversation } from '@/hooks/messaging/useStartConversation';

/**
 * The thread this quote is discussed in, and how to get into it.
 *
 * WHY THIS IS THE PAIR'S THREAD AND NOT THE QUOTE'S
 * `conversations` has `type`, `vendor_id` and participants; it has no
 * `quotation_id`, and both find-or-create RPCs (0813c, 0815g) deliberately
 * converge on one row per client↔vendor pair. So there is exactly one thread
 * with this client, and this is it. The tab is labelled for the person rather
 * than for the quote because that is what it honestly is — a vendor who quoted
 * the same client twice would otherwise be shown "their" thread on both pages
 * under two names, and reply to a March wedding in a June enquiry.
 *
 * FINDING BEFORE CREATING
 * The existing thread is matched out of `get_my_conversations()` on
 * `counterparty_id`, not created on mount. Opening a quotation page must not
 * write a row — a vendor browsing ten quotes would seed ten empty conversations
 * into ten clients' inboxes, each one a notification about nothing. The
 * find-or-create only runs when they actually press the button, which is what
 * `open` is.
 *
 * The inbox read is shared with the top bar's unread panel on one query key, so
 * this costs nothing on a page whose header already asked for it.
 */
export function useQuotationConversation(
  clientId: string | null | undefined,
  { isActive }: { isActive: boolean },
) {
  const { conversations, isLoading } = useConversationViews();
  const start = useStartConversation();

  const conversation = useMemo<ConversationView | null>(() => {
    if (!clientId) return null;
    return (
      conversations.find((c) => c.type === 'client_vendor' && c.counterpartyId === clientId) ?? null
    );
  }, [conversations, clientId]);

  /**
   * Ensures the thread exists and hands back its id.
   *
   * `useStartConversation` navigates to `/messages/:id` on success, which is
   * the inbox behaviour and wrong here — the point of the in-page tab is that
   * the vendor answers without leaving the quote. `openInPlace` is the same RPC
   * without the navigation; the caller decides where the reader ends up.
   */
  /**
   * Live delivery into the embedded thread, while it is the tab on screen.
   *
   * The portal shell already subscribes on every page, but with no
   * `conversationId` — it announces arrivals and refreshes the inbox counts,
   * and never invalidates `MESSAGING_KEYS.thread(id)`. Without this the bubbles
   * in the panel would sit still while the badge beside it counted up, which is
   * the worst of both: the page knows a message arrived and will not show it.
   *
   * A second concurrent subscriber is anticipated rather than tolerated — see
   * `channelSeq` in `useMessagingRealtime`, which exists precisely because the
   * shell and an open thread subscribe at the same time.
   */
  useMessagingSync(conversation?.id ?? null, { enabled: isActive && !!conversation });

  const open = useCallback(() => start.messageClientInPlace(clientId), [start, clientId]);

  return {
    conversation,
    /**
     * Unread messages in this thread, for the tab's badge. Zero when there is
     * no thread yet, which reads correctly: nothing unread in a conversation
     * nobody has had.
     */
    unreadCount: conversation?.unreadCount ?? 0,
    /**
     * The inbox list is still arriving. Only meaningful before a thread is
     * resolved — it is what stops the tab flashing "no conversation yet" at a
     * vendor who has been talking to this client for a week.
     */
    isLoading: isLoading && !conversation,
    isStarting: start.isBusy,
    error: start.error,
    clearError: start.clearError,
    open,
  };
}
