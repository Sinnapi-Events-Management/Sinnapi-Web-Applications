/**
 * The vendor dossier's sections, mirrored into the URL
 * (`/vendors/:id?tab=offers`).
 *
 * Keyed by name rather than by index, and that is the point rather than a
 * style preference: the tabs used to be an array read by position, so adding
 * Offers in the middle would have silently re-pointed every link and every
 * remembered position by one. A name survives insertion.
 *
 * The order follows what an operator does with a complaint. Who is this
 * (overview) → what have they actually done (bookings, orders, payments) →
 * what are they publishing (packages, offers) → what do we owe them (payouts) →
 * what do clients say (reviews).
 *
 * Offers sits immediately after Packages because the two are one subject read
 * twice: a package is what a price is quoted from, an offer is what is taken
 * off it, and a complaint about "the price on their page" is nearly always
 * about the pair rather than either alone.
 *
 * Overview leads and is the default, represented by the *absence* of the
 * parameter, so `/vendors/:id` stays canonical.
 */
export const VENDOR_TABS = [
  'overview',
  'bookings',
  'orders',
  'payments',
  'packages',
  'offers',
  'payouts',
  'reviews',
] as const;

export type VendorTab = (typeof VENDOR_TABS)[number];

/** The tab bar's labels, keyed so an unlabelled new section is a type error. */
export const VENDOR_TAB_LABELS: Record<VendorTab, string> = {
  overview: 'Overview',
  bookings: 'Bookings',
  orders: 'Orders',
  payments: 'Payments',
  packages: 'Packages',
  offers: 'Offers',
  payouts: 'Payouts & Escrow',
  reviews: 'Reviews',
};
