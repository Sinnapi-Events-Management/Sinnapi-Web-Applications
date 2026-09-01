import { useCallback } from 'react';
import { useUrlTab } from '@sinnapi/ui/router';
import { QUOTATION_TABS } from '../schema';
import { useQuotationBooking } from './useQuotationBooking';
import { useQuotationDetail } from './useQuotationDetail';
import { useQuotationFeedback } from './useQuotationFeedback';
import { useQuotationConversation } from './useQuotationConversation';

/**
 * The page's own state, which is only ever "which section is open" — kept in
 * the URL so a reload, a back button or a link pasted into a message to the
 * vendor all land on the section that was being read.
 *
 * Everything else stays where it was: `useQuotationDetail` owns the reads and
 * every derived figure, and each card below owns its own. Sections deliberately
 * do not report whether they have anything to show, so no tab can disappear
 * underneath a client mid-read — a section with nothing in it says so instead.
 *
 * Three things compose in at this level rather than inside a section, because
 * all three cross the tabs: the last note on the quote, which is drawn above
 * them; the conversation, whose unread count badges a tab the client is not on;
 * and the booking, which is now both a call to action above the tabs and a card
 * inside Progress, and must be one state answering to both.
 *
 * The booking moving up here is also what makes the quotations list's "Create
 * booking" shortcut work from a bare `?book=1`. It used to need `?tab=progress`
 * as well, because the dialog was mounted by a card inside an inactive — and so
 * unmounted — tab panel. The dialog is now mounted by the page, so the shortcut
 * no longer has to know where the card lives.
 */
export function useQuotationDetailPage() {
  const detail = useQuotationDetail();
  const { tab, setTab } = useUrlTab(QUOTATION_TABS);

  const feedback = useQuotationFeedback(detail.quotation);
  const booking = useQuotationBooking(detail.quotation, detail.pricing);
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

  return { ...detail, tab, setTab, feedback, booking, conversation, messageVendor };
}
