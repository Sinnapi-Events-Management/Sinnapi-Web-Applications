import type { EventCardModel } from '@/lib/types';

/**
 * Choose events to show under "More events like this". Prefers events sharing
 * the current event's occasion or location, then backfills with anything else
 * so the rail is never sparse. Excludes the current event. Pure + deterministic.
 */
export function pickRelated(
  pool: EventCardModel[],
  current: EventCardModel,
  limit = 3,
): EventCardModel[] {
  const others = pool.filter((event) => event.id !== current.id);
  const similar = others.filter(
    (event) =>
      (current.event_type && event.event_type === current.event_type) ||
      (current.location && event.location === current.location),
  );
  const similarIds = new Set(similar.map((event) => event.id));
  const backfill = others.filter((event) => !similarIds.has(event.id));
  return [...similar, ...backfill].slice(0, limit);
}
