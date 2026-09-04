import { DetailTabs, type DetailTabItem } from '@sinnapi/ui';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import HistoryIcon from '@mui/icons-material/History';
import { SUBSCRIPTION_TABS, type SubscriptionTab } from '../../schema';

type Props = {
  value: SubscriptionTab;
  onChange: (next: SubscriptionTab) => void;
  /** Payments that went through — the badge on the payments tab. */
  succeededPayments: number;
};

/**
 * This page's labels and icons for the shared detail-tab bar. Keyed by the
 * tab union so adding a section to `SUBSCRIPTION_TABS` without labelling it
 * here is a type error rather than a tab that renders blank.
 */
const TAB_META: Record<SubscriptionTab, Omit<DetailTabItem<SubscriptionTab>, 'value'>> = {
  overview: { label: 'Overview', icon: <WorkspacePremiumOutlinedIcon fontSize="small" /> },
  payments: { label: 'Payments', icon: <ReceiptLongOutlinedIcon fontSize="small" /> },
  timeline: { label: 'Timeline', icon: <HistoryIcon fontSize="small" /> },
};

export default function SubscriptionTabs({ value, onChange, succeededPayments }: Props) {
  const items = SUBSCRIPTION_TABS.map((tab) => ({
    value: tab,
    ...TAB_META[tab],
    badge: tab === 'payments' ? succeededPayments : undefined,
  }));

  return (
    <DetailTabs
      items={items}
      value={value}
      onChange={onChange}
      idPrefix="subscription"
      ariaLabel="Subscription sections"
    />
  );
}
