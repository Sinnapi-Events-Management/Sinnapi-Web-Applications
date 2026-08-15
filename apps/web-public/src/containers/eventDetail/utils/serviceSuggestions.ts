import type { EventCardModel } from '@/lib/types';

/**
 * Vendor categories that typically serve each occasion. Values match
 * `VENDOR_CATEGORIES` in site config, so each one links straight into the
 * vendors directory via `/vendors?category=<token>`. Used to suggest "services
 * this event needs", turning the detail page into a path back to the marketplace.
 *
 * Keyed by `event_types.key`. A curated editorial mapping, so it stays a
 * literal — but a key that no occasion carries is a silent dead entry: every
 * event of that type quietly falls through to `DEFAULT_SERVICES`. That is what
 * `corporate`, `concert` and `product_launch` were doing here, while the
 * occasions clients actually post — `introduction`, `company_event`,
 * `fundraising` — had no mapping at all.
 */
const SERVICE_MAP: Record<string, string[]> = {
  wedding: [
    'decorator',
    'caterer',
    'photographer',
    'videographer',
    'florist',
    'makeup_artist',
    'mc',
    'dj',
  ],
  // The kwanjula is its own full-scale event, not a rehearsal for the wedding.
  introduction: ['decorator', 'caterer', 'photographer', 'videographer', 'mc', 'makeup_artist'],
  company_event: ['venue', 'caterer', 'equipment', 'mc', 'photographer', 'security'],
  conference: ['venue', 'equipment', 'caterer', 'security', 'photographer'],
  birthday: ['decorator', 'caterer', 'dj', 'photographer', 'entertainment'],
  graduation: ['photographer', 'caterer', 'decorator', 'dj'],
  baby_shower: ['decorator', 'caterer', 'photographer', 'florist'],
  anniversary: ['decorator', 'caterer', 'florist', 'photographer', 'entertainment'],
  fundraising: ['venue', 'caterer', 'mc', 'photographer', 'entertainment', 'security'],
  company_launch: ['venue', 'equipment', 'decorator', 'photographer', 'videographer', 'mc'],
};

/** A sensible default when an event has no type or an unmapped one. */
const DEFAULT_SERVICES = ['decorator', 'caterer', 'photographer', 'dj', 'venue'];

/** Category tokens to suggest for an event, deduped and capped for a tidy row. */
export function suggestedServices(event: EventCardModel, limit = 6): string[] {
  const base = (event.event_type && SERVICE_MAP[event.event_type]) || DEFAULT_SERVICES;
  return [...new Set(base)].slice(0, limit);
}
