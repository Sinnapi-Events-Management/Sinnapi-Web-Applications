import { HeroMetaSection, formatAmount } from '@sinnapi/ui';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import { formatDate } from '@/lib/config';
import type { EventBudgetSummaryModel, MyEventModel } from '@/lib/types';

type Props = {
  event: MyEventModel;
  budget: EventBudgetSummaryModel | null;
};

/**
 * The quick-glance facts under the event's title.
 *
 * The budget is the only fact marked primary — it is the number this page
 * exists to hold, and it is what a client checks first on a phone. The date,
 * the place and the occasion are all restated as labelled rows in the Details
 * card below, so marking them secondary costs a phone reader nothing and buys
 * back the rows that push the budget card off the screen.
 *
 * The figure shown is the budget itself rather than what is left, because this
 * strip sits directly above a meter that says what is left in three ways. Two
 * different money figures within one screen height, neither labelled as which,
 * is the arrangement that makes a client mistrust both.
 */
export default function EventHeroMeta({ event, budget }: Props) {
  const currency = budget?.currency ?? event.currency ?? 'UGX';
  const amount = budget?.budget_amount ?? event.budget_max ?? event.budget_min;

  return (
    <HeroMetaSection
      facts={[
        {
          icon: <PaymentsOutlinedIcon />,
          text: amount == null ? 'No budget set' : `${formatAmount(amount, currency)} budget`,
        },
        event.event_date && {
          icon: <EventOutlinedIcon />,
          text: formatDate(event.event_date),
          secondary: true,
        },
        event.location && {
          icon: <PlaceOutlinedIcon />,
          text: event.location,
          secondary: true,
        },
        event.event_type && {
          icon: <CategoryOutlinedIcon />,
          text: event.event_type.name,
          secondary: true,
        },
      ]}
    />
  );
}
