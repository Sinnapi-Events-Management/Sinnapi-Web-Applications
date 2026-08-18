import { Grid } from '@sinnapi/ui';
import type { MyEventModel } from '@/lib/types';
import MyEventCard from '../molecules/MyEventCard';

type Props = {
  events: MyEventModel[];
};

/** The posted-events collection. Empty handling belongs to the page. */
export default function MyEventsGrid({ events }: Props) {
  return (
    <Grid container spacing={3}>
      {events.map((event) => (
        <Grid item xs={12} sm={6} md={4} key={event.id}>
          <MyEventCard event={event} />
        </Grid>
      ))}
    </Grid>
  );
}
