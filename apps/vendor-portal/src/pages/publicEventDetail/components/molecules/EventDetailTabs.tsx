import { DetailTabs } from '@sinnapi/ui';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import { PUBLIC_EVENT_TABS, type PublicEventTab } from '../../schema';

type Props = {
  value: PublicEventTab;
  onChange: (next: PublicEventTab) => void;
  /** Lines nobody is committed to yet — the work still available to bid on. */
  openCount?: number;
  /** This vendor's quotes the client has not seen a price on. */
  unsentCount?: number;
};

const LABELS: Record<PublicEventTab, string> = {
  overview: 'Overview',
  plan: 'Plan & budget',
  quote: 'Your quote',
  booking: 'Booking',
};

const ICONS: Record<PublicEventTab, JSX.Element> = {
  overview: <InfoOutlinedIcon />,
  plan: <ChecklistOutlinedIcon />,
  quote: <RequestQuoteOutlinedIcon />,
  booking: <EventAvailableOutlinedIcon />,
};

/**
 * The event page's sections.
 *
 * Both badges count WORK, not rows — the same rule the client portal's event
 * tabs follow. Open lines are what a vendor could still win; unsent quotes are
 * prices the client is waiting for. A badge counting how many lines or quotes
 * exist would be a fact nobody can act on and that never reaches zero. These
 * clear as the vendor does the thing they point at.
 *
 * Booking carries no badge. A booking is not a to-do — it is the outcome — and
 * a permanent "1" beside it would read as unfinished business forever.
 */
export default function EventDetailTabs({ value, onChange, openCount, unsentCount }: Props) {
  return (
    <DetailTabs
      items={PUBLIC_EVENT_TABS.map((tab) => ({
        value: tab,
        label: LABELS[tab],
        icon: ICONS[tab],
        badge: tab === 'plan' ? openCount : tab === 'quote' ? unsentCount : undefined,
      }))}
      value={value}
      onChange={onChange}
      idPrefix="public-event"
      ariaLabel="Event sections"
      sx={{ mt: 3 }}
    />
  );
}
