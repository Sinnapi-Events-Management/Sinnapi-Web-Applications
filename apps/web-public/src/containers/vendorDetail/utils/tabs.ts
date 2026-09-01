/**
 * The public vendor profile's four sections, mirrored into the URL
 * (`/vendors/acme?tab=packages`).
 *
 * The same words, in the same order, as the signed-in profile in the client
 * portal — minus availability, which this side has no read for. A visitor who
 * browses signed-out and comes back signed in should not have to relearn where
 * the prices live.
 *
 * Overview leads and is the default, represented by the *absence* of the
 * parameter. That matters more here than in a portal: the bare
 * `/vendors/:slug` is the canonical URL in the sitemap and in `generateMetadata`,
 * and a default that wrote itself into the query string would put a second URL
 * for the same page into circulation.
 */
export const VENDOR_DETAIL_TABS = ['overview', 'packages', 'portfolio', 'reviews'] as const;

export type VendorDetailTab = (typeof VENDOR_DETAIL_TABS)[number];
