import { DetailTabs, type DetailTabItem } from '@sinnapi/ui';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import HistoryIcon from '@mui/icons-material/History';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import { BOOKING_TABS, type BookingTab } from '../../schema';

type Props = {
  value: BookingTab;
  onChange: (next: BookingTab) => void;
};

/**
 * This page's labels and icons for the shared detail-tab bar.
 *
 * Keyed by the tab union rather than written out as an array, so adding a
 * section to `BOOKING_TABS` without labelling it here is a type error rather
 * than a tab that renders blank.
 */
const TAB_META: Record<BookingTab, Omit<DetailTabItem<BookingTab>, 'value'>> = {
  overview: { label: 'Overview', icon: <ReceiptLongOutlinedIcon fontSize="small" /> },
  money: { label: 'Payment', icon: <PaymentsOutlinedIcon fontSize="small" /> },
  escrow: { label: 'Escrow', icon: <ShieldOutlinedIcon fontSize="small" /> },
  activity: { label: 'Activity', icon: <HistoryIcon fontSize="small" /> },
  origin: { label: 'Origin', icon: <RequestQuoteOutlinedIcon fontSize="small" /> },
};

const ITEMS = BOOKING_TABS.map((value) => ({ value, ...TAB_META[value] }));

export default function BookingTabs({ value, onChange }: Props) {
  return (
    <DetailTabs
      items={ITEMS}
      value={value}
      onChange={onChange}
      idPrefix="booking"
      ariaLabel="Booking sections"
    />
  );
}
