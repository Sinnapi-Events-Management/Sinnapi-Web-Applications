/** The one-tap views over the bookings list, in the order they are shown. */
export const QUICK_TABS = [
  { value: 'reply', label: 'To answer' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All' },
] as const;

export type QuickTab = (typeof QUICK_TABS)[number]['value'];
