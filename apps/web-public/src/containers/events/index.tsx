import { Container } from '@sinnapi/ui';
import EventsHero from './organisms/eventsHero';
import EventsToolbar from './organisms/eventsToolbar';
import EventsResults from './organisms/eventsResults';
import type { EventsSearchParams } from './data/filterEvents';
import { getEventsData } from './utils/getEventsData';

/**
 * Events page. Composes the experience as: a search-led hero → a refinement
 * toolbar → the reveal-on-scroll grid. Search & filtering are URL-driven and
 * resolved server-side in `getEventsData` (with a mock fallback while the table
 * is empty); presentation lives in the organisms, so this file only sequences
 * them and threads the current query through.
 */
export default async function EventsContainer({
  searchParams,
}: {
  searchParams: EventsSearchParams;
}) {
  const { events, total, activeFilters } = await getEventsData(searchParams);

  return (
    <>
      <EventsHero defaults={searchParams} />
      <Container sx={{ py: { xs: 4, md: 6 } }}>
        <EventsToolbar
          defaults={searchParams}
          resultCount={events.length}
          total={total}
          activeFilters={activeFilters}
        />
        <EventsResults events={events} activeFilters={activeFilters} />
      </Container>
    </>
  );
}
