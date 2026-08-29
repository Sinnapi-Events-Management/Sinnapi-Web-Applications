import { useCallback } from 'react';
import { useUrlTab } from '@sinnapi/ui/router';
import { QUOTATION_TABS } from '../schema';
import { useQuotationDetail } from './useQuotationDetail';
import { useQuotationFeedback } from './useQuotationFeedback';
import { useQuotationConversation } from './useQuotationConversation';

/**
 * The page's own state, which is only ever "which section is open" — kept in
 * the URL so a reload, a back button or a link pasted into a message to the
 * vendor all land on the section that was being read.
 *
 * It is also what makes the quotations list's "Create booking" shortcut work:
 * that link carries `?tab=progress`, and this is what reads it.
 *
 * Everything else stays where it was: `useQuotationDetail` owns the reads and
 * every derived figure, and each card below owns its own. Sections deliberately
 * do not report whether they have anything to show, so no tab can disappear
 * underneath a client mid-read — a section with nothing in it says so instead.
 *
 * Two things compose in at this level rather than inside a section, because
 * both cross the tabs: the last note on the quote, which is drawn above them,
 * and the conversation, whose unread count badges a tab the client is not on.
 */
export function useQuotationDetailPage() {
  const detail = useQuotationDetail();
  const { tab, setTab } = useUrlTab(QUOTATION_TABS);

  const feedback = useQuotationFeedback(detail.quotation);
  const conversation = useQuotationConversation(detail.quotation?.vendor_id, {
    isActive: tab === 'messages',
  });

  /**
   * Ensure the thread exists, then show it — in that order, and without leaving
   * the page.
   *
   * The tab switches whatever the RPC returned. A client who pressed "Message
   * vendor" and got a refusal — a vendor since suspended, which
   * `get_or_create_client_vendor_conversation` explicitly rejects — needs to
   * see the refusal, and the message tab is where it is rendered.
   */
  const messageVendor = useCallback(async () => {
    await conversation.open();
    setTab('messages');
  }, [conversation, setTab]);

  return { ...detail, tab, setTab, feedback, conversation, messageVendor };
}
