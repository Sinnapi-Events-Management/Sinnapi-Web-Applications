import { Grid } from '@sinnapi/ui';
import EventCard from '@/components/molecules/eventCard';
import EmptyState from '@/components/molecules/emptyState';
import type { EventCardModel } from '@/lib/types';

/**
 * The events grid. Each card fades + lifts into place the first time it scrolls
 * into view (one-shot, GPU-only — see `ScrollReveal`), cascading by column so a
 * row reveals as a gentle wave. Falls back to a contextual empty state whose CTA
 * adapts to whether filters are active.
 */
export default function EventsResults({
  events,
  activeFilters,
}: {
  events: EventCardModel[];
  activeFilters: number;
}) {
  if (events.length === 0) {
    return activeFilters > 0 ? (
      <EmptyState
        title="No events match your filters"
        description="Try a different occasion, location or budget — or clear your filters to see everything."
        ctaLabel="Clear filters"
        ctaHref="/events"
      />
    ) : (
      <EmptyState
        title="No events published yet"
        description="Check back soon for event inspiration and open opportunities looking for vendors."
      />
    );
  }

  return (
    <Grid container spacing={3}>
      {events.map((event, i) => (
        <Grid item xs={12} sm={6} md={4} key={event.id}>
          <EventCard event={event} />
        </Grid>
      ))}
    </Grid>
  );
}
