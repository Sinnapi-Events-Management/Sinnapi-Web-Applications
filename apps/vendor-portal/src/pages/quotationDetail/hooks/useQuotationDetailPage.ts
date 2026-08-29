import { useCallback } from 'react';
import { useUrlTab } from '@sinnapi/ui/router';
import { QUOTATION_TABS } from '../schema';
import { useQuotationDetail } from './useQuotationDetail';
import { useQuotationFeedback } from './useQuotationFeedback';
import { useQuotationConversation } from './useQuotationConversation';

/**
 * The page's own state, which is only ever "which section is open" — kept in
 * the URL so a reload, a back button or a link pasted into a support thread all
 * land on the section that was being read.
 *
 * Everything else stays where it was: `useQuotationDetail` owns the reads and
 * every derived figure, and each card below owns its own. Sections deliberately
 * do not report whether they have anything to show, so no tab can disappear
 * underneath a vendor mid-read — a section with nothing in it says so instead.
 *
 * Two things compose in at this level rather than inside a section, because
 * both cross the tabs: the client's last note, which is drawn above them, and
 * the conversation, whose unread count badges a tab the vendor is not on.
 */
export function useQuotationDetailPage() {
  const detail = useQuotationDetail();
  const { tab, setTab } = useUrlTab(QUOTATION_TABS);

  const feedback = useQuotationFeedback(detail.quotation);
  const conversation = useQuotationConversation(detail.quotation?.client_id, {
    isActive: tab === 'messages',
  });

  /**
   * Ensure the thread exists, then show it — in that order, and without leaving
   * the page.
   *
   * The tab switches whatever the RPC returned. A vendor who pressed "Message
   * client" and got a refusal needs to see the refusal, and the message tab is
   * where it is rendered; leaving them on Overview with nothing visibly changed
   * reads as a dead button.
   */
  const messageClient = useCallback(async () => {
    await conversation.open();
    setTab('messages');
  }, [conversation, setTab]);

  return { ...detail, tab, setTab, feedback, conversation, messageClient };
}
