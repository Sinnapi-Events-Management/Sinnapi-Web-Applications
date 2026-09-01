import { HeroMetaSection } from '@sinnapi/ui';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PlaceIcon from '@mui/icons-material/Place';
import PaymentsIcon from '@mui/icons-material/Payments';
import { formatDate } from '@/lib/config';
import { budgetLabel } from '@/lib/events';
import type { PublicEventDetailModel } from '@/lib/types';

type Props = { event: PublicEventDetailModel };

/**
 * The facts a vendor checks before deciding whether to quote at all: when it
 * is, where it is, and what the client said it is worth.
 *
 * The budget stays on a phone and the other two drop, which is the arrangement
 * `HeroMeta` documents: the hero and the tab bar together eat most of a small
 * screen before the first section begins, so only the deciding figure survives
 * there. Nothing is lost — the Overview tab states all three as labelled rows,
 * one tap away.
 *
 * The budget shown is the client's published range and nothing else. There is
 * no vendor-side equivalent of the client portal's budget meter, and there
 * cannot be: `event_budget_summary` refuses any caller who is not the poster,
 * because how much of a budget is still unspent is the number that turns a 2m
 * quote into a 3m one.
 */
export default function EventHeroMeta({ event }: Props) {
  const budget = budgetLabel(event);

  return (
    <HeroMetaSection
      facts={[
        budget && { icon: <PaymentsIcon />, text: budget },
        event.event_date && {
          icon: <CalendarMonthIcon />,
          text: formatDate(event.event_date),
          secondary: true,
        },
        event.location && { icon: <PlaceIcon />, text: event.location, secondary: true },
      ]}
    />
  );
}
