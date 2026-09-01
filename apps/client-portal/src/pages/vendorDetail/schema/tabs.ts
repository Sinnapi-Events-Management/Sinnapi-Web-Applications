/**
 * The vendor profile's six sections, mirrored into the URL
 * (`/vendors/:slug?tab=availability`).
 *
 * The split follows the order a visitor actually asks their questions, which is
 * also the order the single-column page used to stack them in: who is this
 * (overview) → what does it cost (packages) → can I pay less than that (offers)
 * → is the work any good (portfolio) → can they do my date (availability) → do
 * others trust them (reviews).
 *
 * Offers earns the sixth tab rather than living only in the strip above the
 * bar. The strip fits one line per offer — the claim, the deadline, the code —
 * and every fact that decides whether a saving applies to THIS client does not
 * fit on it: what it covers, what the booking has to be worth, which event
 * dates qualify, and the vendor's own terms. It sits immediately after Packages
 * because it is a fact about those prices rather than a subject of its own.
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
 * has no read for, and minus offers, which it shows as a strip on the overview
 * rather than a section of its own — a signed-out visitor cannot see the codes,
 * so a whole tab of redacted ones would be a tab that mostly withholds. What
 * they can see, they see under the same words: a visitor who browses signed-out
 * and comes back signed in should not have to relearn where anything lives.
 */
export const VENDOR_DETAIL_TABS = [
  'overview',
  'packages',
  'offers',
  'portfolio',
  'availability',
  'reviews',
] as const;

export type VendorDetailTab = (typeof VENDOR_DETAIL_TABS)[number];
