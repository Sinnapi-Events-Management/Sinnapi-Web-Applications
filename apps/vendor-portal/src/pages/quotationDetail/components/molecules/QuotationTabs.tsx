import { useMemo } from 'react';
import { DetailTabs, type DetailTabItem } from '@sinnapi/ui';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import TimelineIcon from '@mui/icons-material/Timeline';
import { QUOTATION_TABS, type QuotationTab } from '../../schema';

type Props = {
  value: QuotationTab;
  onChange: (next: QuotationTab) => void;
  /** Unread messages in this client's thread, badged onto the Messages tab. */
  unreadCount?: number;
};

/**
 * This page's labels and icons for the shared detail-tab bar.
 *
 * Keyed by the tab union rather than written out as an array, so adding a
 * section to `QUOTATION_TABS` without labelling it here is a type error rather
 * than a tab that renders blank.
 */
const TAB_META: Record<QuotationTab, Omit<DetailTabItem<QuotationTab>, 'value'>> = {
  overview: { label: 'Overview', icon: <DescriptionOutlinedIcon fontSize="small" /> },
  quote: { label: 'Quote', icon: <ReceiptLongOutlinedIcon fontSize="small" /> },
  payment: { label: 'Payment', icon: <HandshakeOutlinedIcon fontSize="small" /> },
  messages: { label: 'Messages', icon: <ForumOutlinedIcon fontSize="small" /> },
  progress: { label: 'Progress', icon: <TimelineIcon fontSize="small" /> },
};

export default function QuotationTabs({ value, onChange, unreadCount = 0 }: Props) {
  // Rebuilt only when the count moves. The array is otherwise constant, and a
  // fresh one each render would re-key every tab in the bar on any parent
  // update — on a page that re-renders whenever a message arrives.
  const items = useMemo(
    () =>
      QUOTATION_TABS.map((tab) => ({
        value: tab,
        ...TAB_META[tab],
        // Badged even while the reader is standing on the tab: the count comes
        // from `get_my_conversations`, which clears when the thread is scrolled
        // to the bottom, not when the tab is selected. Hiding it on the active
        // tab would drop the badge a moment before the messages were read.
        ...(tab === 'messages' ? { badge: unreadCount } : null),
      })),
    [unreadCount],
  );

  return (
    <DetailTabs
      items={items}
      value={value}
      onChange={onChange}
      idPrefix="quotation"
      ariaLabel="Quotation sections"
    />
  );
}
