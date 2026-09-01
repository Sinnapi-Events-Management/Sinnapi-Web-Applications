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
 * with this vendor, and this is it. The tab is labelled for the business rather
 * than for the quote because that is what it honestly is — a client holding two
 * quotes from the same vendor would otherwise see one set of messages under two
 * names and reasonably conclude each quote had its own thread.
 *
 * MATCHED ON `vendor_id`, NOT ON THE COUNTERPARTY. The vendor's side matches on
 * `counterparty_id` because a client is a profile; here the other party is a
 * *business*, and the profile behind it is `vendors.owner_id` — a column no
 * client screen reads and RLS would not disclose anyway. `conversations.vendor_id`
 * is the same key `get_or_create_client_vendor_conversation` matches on, so the
 * thread this finds and the thread that RPC returns are the same row.
 *
 * FINDING BEFORE CREATING. The thread is not created on mount: a client
 * comparing five quotes would otherwise seed five empty conversations into five
 * vendors' inboxes, each one a notification about nothing. The find-or-create
 * runs when they press the button, which is what `open` is.
 */
export function useQuotationConversation(
  vendorId: string | null | undefined,
  { isActive }: { isActive: boolean },
) {
  const { conversations, isLoading } = useConversationViews();
  const start = useStartConversation();

  const conversation = useMemo<ConversationView | null>(() => {
    if (!vendorId) return null;
    return conversations.find((c) => c.type === 'client_vendor' && c.vendorId === vendorId) ?? null;
  }, [conversations, vendorId]);

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

  const open = useCallback(() => start.messageVendorInPlace(vendorId), [start, vendorId]);

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
     * resolved — it is what stops the tab flashing "no messages yet" at a
     * client who has been talking to this vendor for a week.
     */
    isLoading: isLoading && !conversation,
    isStarting: start.isBusy,
    error: start.error,
    clearError: start.clearError,
    open,
  };
}
