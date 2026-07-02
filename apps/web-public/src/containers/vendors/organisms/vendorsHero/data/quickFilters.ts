/**
 * A short list of popular vendor categories surfaced as one-tap chips under the
 * hero search. Each links to the same `/vendors?category=` URL the filter form
 * produces, so the chips are just fast paths into the server-side filtering — no
 * client JS. `category` values are the snake_case DB slugs from site config.
 */
export const QUICK_FILTERS: { label: string; category: string }[] = [
  { label: 'Photographers', category: 'photographer' },
  { label: 'Decorators', category: 'decorator' },
  { label: 'Caterers', category: 'caterer' },
  { label: 'Venues', category: 'venue' },
  { label: 'Makeup', category: 'makeup_artist' },
];
