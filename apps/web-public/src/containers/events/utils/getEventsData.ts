import { getEvents } from '@/lib/queries';
import { MOCK_EVENTS } from '../data/mockEvents';
import { filterEvents, countActiveFilters, type EventsSearchParams } from '../data/filterEvents';

/**
 * Resolves the events grid for the current URL. Pulls live published events;
 * while the table is empty (development) it falls back to the mock dataset so
 * the page is always populated. Search + facet narrowing is applied in-memory
 * via `filterEvents`, so the same code path serves live and mock data.
 *
 * Returns the filtered `events`, the unfiltered `total` (for "N of M" copy), and
 * the count of active filters (drives the empty-state + "clear" affordances).
 */
export async function getEventsData(searchParams: EventsSearchParams) {
  const live = await getEvents();
  const all = live.length > 0 ? live : MOCK_EVENTS;
  const events = filterEvents(all, searchParams);

  return {
    events,
    total: all.length,
    activeFilters: countActiveFilters(searchParams),
  };
}
