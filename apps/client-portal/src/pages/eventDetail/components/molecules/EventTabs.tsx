import { DetailTabs } from '@sinnapi/ui';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import { EVENT_TABS, type EventTab } from '../../schema';

type Props = {
  value: EventTab;
  onChange: (next: EventTab) => void;
  /** Lines with nobody lined up yet — the work still outstanding on the plan. */
  openCount?: number;
  /** Quotes waiting on the client's answer — the only thing here that is a to-do. */
  awaitingCount?: number;
};

const LABELS: Record<EventTab, string> = {
  overview: 'Overview',
  plan: 'Plan & budget',
  vendors: 'Vendors',
};

const ICONS: Record<EventTab, JSX.Element> = {
  overview: <InfoOutlinedIcon />,
  plan: <ChecklistOutlinedIcon />,
  vendors: <GroupsOutlinedIcon />,
};

/**
 * The event page's sections.
 *
 * Both badges count work rather than rows: unfilled lines on the plan, and
 * quotes waiting on an answer under vendors. That distinction is the whole
 * point — a badge showing how many vendors exist would be a fact the client
 * cannot act on, and would never reach zero. These do.
 */
export default function EventTabs({ value, onChange, openCount, awaitingCount }: Props) {
  return (
    <DetailTabs
      items={EVENT_TABS.map((tab) => ({
        value: tab,
        label: LABELS[tab],
        icon: ICONS[tab],
        badge: tab === 'plan' ? openCount : tab === 'vendors' ? awaitingCount : undefined,
      }))}
      value={value}
      onChange={onChange}
      idPrefix="event"
      ariaLabel="Event sections"
      sx={{ mt: 3 }}
    />
  );
}
