/**
 * The vendor profile's five sections, mirrored into the URL
 * (`/vendors/:slug?tab=availability`).
 *
 * The split follows the order a visitor actually asks their questions, which is
 * also the order the single-column page used to stack them in: who is this
 * (overview) → what does it cost (packages) → is the work any good (portfolio)
 * → can they do my date (availability) → do others trust them (reviews).
 *
 * Splitting them is the point. Stacked, a portfolio of forty photos sat between
 * the price and the calendar, so a visitor checking whether a vendor was free
 * on their date scrolled through the entire body of work to find out — twice, if
 * they wanted to compare it against the price again.
 *
 * Overview leads and is the default, represented by the *absence* of the
 * parameter, so `/vendors/:slug` stays canonical and adding a section later can
 * never re-point a link someone has already shared.
 *
 * The public site names its sections the same way, minus availability, which it
 * has no read for. Deliberate: a visitor who browses signed-out and comes back
 * signed in should not have to relearn where anything lives.
 */
export const VENDOR_DETAIL_TABS = [
  'overview',
  'packages',
  'portfolio',
  'availability',
  'reviews',
] as const;

export type VendorDetailTab = (typeof VENDOR_DETAIL_TABS)[number];
