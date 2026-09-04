import { DetailTabs, type DetailTabItem } from '@sinnapi/ui';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import TimelineIcon from '@mui/icons-material/Timeline';
import HistoryIcon from '@mui/icons-material/History';
import CodeIcon from '@mui/icons-material/Code';
import RuleIcon from '@mui/icons-material/Rule';
import { PAYMENT_TABS, type PaymentTab } from '../../schema';

type Props = {
  value: PaymentTab;
  onChange: (next: PaymentTab) => void;
  /** Open reconciliation exceptions — the badge on the exceptions tab. */
  openExceptions: number;
};

/**
 * This page's labels and icons for the shared detail-tab bar. Keyed by the tab
 * union rather than written out as an array, so adding a section to
 * `PAYMENT_TABS` without labelling it here is a type error rather than a tab
 * that renders blank.
 */
const TAB_META: Record<PaymentTab, Omit<DetailTabItem<PaymentTab>, 'value'>> = {
  trace: { label: 'Trace', icon: <TimelineIcon fontSize="small" /> },
  overview: { label: 'Overview', icon: <ReceiptLongOutlinedIcon fontSize="small" /> },
  // "Deliveries", not "Timeline": this section is `payment_events`, the
  // provider's delivery attempts and the idempotency gate. Calling it a
  // timeline is what made the absence of a real one hard to notice.
  deliveries: { label: 'Deliveries', icon: <HistoryIcon fontSize="small" /> },
  payloads: { label: 'Payloads', icon: <CodeIcon fontSize="small" /> },
  exceptions: { label: 'Exceptions', icon: <RuleIcon fontSize="small" /> },
};

export default function PaymentTabs({ value, onChange, openExceptions }: Props) {
  const items = PAYMENT_TABS.map((tab) => ({
    value: tab,
    ...TAB_META[tab],
    badge: tab === 'exceptions' ? openExceptions : undefined,
  }));

  return (
    <DetailTabs
      items={items}
      value={value}
      onChange={onChange}
      idPrefix="payment"
      ariaLabel="Payment sections"
    />
  );
}
