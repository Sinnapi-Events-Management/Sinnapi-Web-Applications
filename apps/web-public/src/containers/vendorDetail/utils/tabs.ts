/**
 * The public vendor profile's three tabbed sections, mirrored into the URL
 * (`/vendors/acme?tab=packages`).
 *
 * The photo gallery is rendered above the tabs, so this switcher keeps the remaining
 * information easy to navigate without making visitors scroll through it.
 *
 * Overview leads and is the default, represented by the *absence* of the
 * parameter. That matters more here than in a portal: the bare
 * `/vendors/:slug` is the canonical URL in the sitemap and in `generateMetadata`,
 * and a default that wrote itself into the query string would put a second URL
 * for the same page into circulation.
 */
export const VENDOR_DETAIL_TABS = ['overview', 'packages', 'reviews'] as const;

export type VendorDetailTab = (typeof VENDOR_DETAIL_TABS)[number];
