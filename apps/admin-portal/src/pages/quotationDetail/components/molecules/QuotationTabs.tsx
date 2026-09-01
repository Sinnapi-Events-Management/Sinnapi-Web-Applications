import { DetailTabs, type DetailTabItem } from '@sinnapi/ui';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import TimelineIcon from '@mui/icons-material/Timeline';
import { QUOTATION_TABS, type QuotationTab } from '../../schema';

type Props = {
  value: QuotationTab;
  onChange: (next: QuotationTab) => void;
};

/**
 * This page's labels and icons for the shared detail-tab bar.
 *
 * Keyed by the tab union rather than written out as an array, so adding a
 * section to `QUOTATION_TABS` without labelling it here is a type error rather
 * than a tab that renders blank.
 *
 * The labels match the vendor's and the client's pages one for one, which
 * matters most on this side: an operator on a support call is describing this
 * screen to someone looking at one of theirs.
 */
const TAB_META: Record<QuotationTab, Omit<DetailTabItem<QuotationTab>, 'value'>> = {
  overview: { label: 'Overview', icon: <DescriptionOutlinedIcon fontSize="small" /> },
  quote: { label: 'Quote', icon: <ReceiptLongOutlinedIcon fontSize="small" /> },
  payment: { label: 'Payment', icon: <HandshakeOutlinedIcon fontSize="small" /> },
  progress: { label: 'Progress', icon: <TimelineIcon fontSize="small" /> },
};

const ITEMS = QUOTATION_TABS.map((value) => ({ value, ...TAB_META[value] }));

export default function QuotationTabs({ value, onChange }: Props) {
  return (
    <DetailTabs
      items={ITEMS}
      value={value}
      onChange={onChange}
      idPrefix="quotation"
      ariaLabel="Quotation sections"
    />
  );
}
