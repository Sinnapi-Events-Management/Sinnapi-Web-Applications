/**
 * The vendor profile's seven sections, mirrored into the URL
 * (`/vendors/:slug?tab=availability`).
 *
 * Portfolio leads the bar: the work is what a visitor came to judge, so it is
 * the first thing offered. Overview follows as the profile's own introduction.
 * Quotations sits right after Overview, because a client's own quote with this
 * vendor is part of the profile they are reading rather than a separate page.
 * The rest follow the questions a visitor asks next: what does it cost (packages)
 * → can I pay less than that (offers) → can they do my date (availability) → do
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
 * The first entry is the default, represented by the *absence* of the parameter,
 * so `/vendors/:slug` stays canonical. That makes Portfolio the landing section.
 * It also means a link someone shared before this change, which opened on
 * Overview, now opens on Portfolio. Overview is one tap away.
 *
 * The public site names its sections the same way, minus availability, which it
 * has no read for, and minus offers, which it shows as a strip on the overview
 * rather than a section of its own — a signed-out visitor cannot see the codes,
 * so a whole tab of redacted ones would be a tab that mostly withholds. What
 * they can see, they see under the same words: a visitor who browses signed-out
 * and comes back signed in should not have to relearn where anything lives.
 */
export const VENDOR_DETAIL_TABS = [
  'portfolio',
  'overview',
  'quotations',
  'packages',
  'offers',
  'availability',
  'reviews',
] as const;

export type VendorDetailTab = (typeof VENDOR_DETAIL_TABS)[number];
