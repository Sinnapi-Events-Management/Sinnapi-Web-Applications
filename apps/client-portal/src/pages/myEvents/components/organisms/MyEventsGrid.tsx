import { Grid } from '@sinnapi/ui';
import type { MyEventBudgetModel, MyEventModel } from '@/lib/types';
import MyEventCard from '../molecules/MyEventCard';

type Props = {
  events: MyEventModel[];
  /** Budget rollups keyed by event id. Undefined until the second read lands. */
  budgets?: Map<string, MyEventBudgetModel>;
  budgetsLoading?: boolean;
};

/** The posted-events collection. Empty handling belongs to the page. */
export default function MyEventsGrid({ events, budgets, budgetsLoading }: Props) {
  return (
    <Grid container spacing={3}>
      {events.map((event) => (
        <Grid item xs={12} sm={6} md={4} key={event.id}>
          <MyEventCard
            event={event}
            budget={budgets?.get(event.id)}
            budgetLoading={budgetsLoading}
          />
        </Grid>
      ))}
    </Grid>
  );
}
