/**
 * A short list of popular event types surfaced as one-tap chips under the hero
 * search. Each links to the same `/events?type=` URL the filter form produces,
 * so the chips are just fast paths into the server-side filtering — no client JS.
 */
export const QUICK_FILTERS: { label: string; type: string }[] = [
  { label: 'Weddings', type: 'wedding' },
  { label: 'Birthdays', type: 'birthday' },
  { label: 'Corporate', type: 'corporate' },
  { label: 'Graduations', type: 'graduation' },
  { label: 'Concerts', type: 'concert' },
];
