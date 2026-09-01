import { SectionGrid } from '@sinnapi/ui';
import type { EventBudgetSummaryModel, MyEventDetailModel } from '@/lib/types';
import EventBudgetCard from './EventBudgetCard';
import EventDetailsCard from './EventDetailsCard';

type Props = {
  event: MyEventDetailModel;
  budget: EventBudgetSummaryModel | null;
  budgetLoading: boolean;
  budgetError: unknown;
};

/**
 * What this event is, and where the money stands.
 *
 * The budget leads the asymmetric pair because it is the reason a client opens
 * this page; the details card restates what they already know. On a phone the
 * grid collapses to one column and that order is preserved.
 */
export default function OverviewSection({ event, budget, budgetLoading, budgetError }: Props) {
  return (
    <SectionGrid template={{ xs: '1fr', md: '7fr 5fr' }}>
      <EventBudgetCard budget={budget} loading={budgetLoading} error={budgetError} />
      <EventDetailsCard event={event} />
    </SectionGrid>
  );
}
