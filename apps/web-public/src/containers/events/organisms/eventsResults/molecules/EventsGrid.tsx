import { Grid } from '@sinnapi/ui/atoms';
import EventCard from '@/components/molecules/eventCard';
import type { EventCardModel } from '@/lib/types';
import EventCardSkeleton from '../atoms/EventCardSkeleton';

/** Breakpoint spans, shared by the real grid and its skeleton so they align. */
const SPAN = { xs: 12, sm: 6, md: 4 } as const;

/**
 * The events grid itself. Three-up at desktop rather than the vendors grid's
 * four: an event card carries a title, a teaser and three meta rows, so the
 * extra column costs more in truncation than it gains in density.
 */
export function EventsGrid({ events }: { events: EventCardModel[] }) {
  return (
    <Grid container spacing={3}>
      {events.map((event) => (
        <Grid item {...SPAN} key={event.id}>
          <EventCard event={event} />
        </Grid>
      ))}
    </Grid>
  );
}

/**
 * First-load placeholder. Renders a full page of cards so the layout settles at
 * its real height immediately rather than growing under the visitor as results
 * stream in — filter changes never reach this path, since `keepPreviousData`
 * keeps the previous results on screen instead.
 */
export function EventsGridSkeleton({ count }: { count: number }) {
  return (
    <Grid container spacing={3}>
      {Array.from({ length: count }, (_, index) => (
        <Grid item {...SPAN} key={index}>
          <EventCardSkeleton />
        </Grid>
      ))}
    </Grid>
  );
}
