import type { EventCardModel } from '@/lib/types';

/**
 * Vendor categories that typically serve each occasion. Tokens match
 * `VENDOR_CATEGORIES` in site config, so each one links straight into the
 * vendors directory via `/vendors?category=<token>`. Used to suggest "services
 * this event needs", turning the detail page into a path back to the marketplace.
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
  corporate: ['venue', 'caterer', 'equipment', 'mc', 'photographer', 'security'],
  conference: ['venue', 'equipment', 'caterer', 'security', 'photographer'],
  birthday: ['decorator', 'caterer', 'dj', 'photographer', 'entertainment'],
  graduation: ['photographer', 'caterer', 'decorator', 'dj'],
  baby_shower: ['decorator', 'caterer', 'photographer', 'florist'],
  anniversary: ['decorator', 'caterer', 'florist', 'photographer', 'entertainment'],
  concert: ['venue', 'equipment', 'security', 'entertainment', 'dj'],
  product_launch: ['venue', 'equipment', 'decorator', 'photographer', 'videographer', 'mc'],
};

/** A sensible default when an event has no type or an unmapped one. */
const DEFAULT_SERVICES = ['decorator', 'caterer', 'photographer', 'dj', 'venue'];

/** Category tokens to suggest for an event, deduped and capped for a tidy row. */
export function suggestedServices(event: EventCardModel, limit = 6): string[] {
  const base = (event.event_type && SERVICE_MAP[event.event_type]) || DEFAULT_SERVICES;
  return [...new Set(base)].slice(0, limit);
}
