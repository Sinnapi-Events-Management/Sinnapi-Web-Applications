import { getEventById, getEvents } from '@/lib/queries';
import { MOCK_EVENTS } from '@/containers/events/data/mockEvents';
import { pickRelated } from '../utils/pickRelated';

/**
 * Resolves a single event plus a few related events for the detail page. Tries
 * the live table first; while it's empty (development) it falls back to the
 * same mock dataset the listing uses, so any card opens a populated page and the
 * switch to real data needs no change here. Related events are drawn from the
 * same source the event came from to keep the rail coherent.
 */
export async function getEventDetailData(id: string) {
  const liveEvent = await getEventById(id);
  if (liveEvent) {
    const pool = await getEvents();
    return { event: liveEvent, related: pickRelated(pool, liveEvent) };
  }

  const mockEvent = MOCK_EVENTS.find((event) => event.id === id) ?? null;
  return {
    event: mockEvent,
    related: mockEvent ? pickRelated(MOCK_EVENTS, mockEvent) : [],
  };
}
