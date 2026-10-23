/**
 * The public vendor profile's four tabbed sections, mirrored into the URL
 * (`/vendors/acme?tab=packages`).
 *
 * Gallery leads and is the default, represented by the *absence* of the
 * parameter. The photos used to be rendered above the switcher instead, which
 * read well on a vendor with six of them and failed on a vendor with twenty:
 * every one of them stood between the visitor and the tab bar, the prices, the
 * reviews and the quote button. As a tab the gallery still opens the page — it
 * is the proof a visitor came for — but it now has the bar sitting above it, so
 * the rest of the profile is one tap away rather than one long scroll.
 *
 * Which section is default is a URL decision as much as a layout one: the bare
 * `/vendors/:slug` is the canonical URL in the sitemap and in
 * `generateMetadata`, and a default that wrote itself into the query string
 * would put a second URL for the same page into circulation. Moving the default
 * therefore moves Overview onto `?tab=overview`; nothing previously linked
 * there, because the parameter was absent whenever Overview was open. Links
 * already in the wild to `?tab=packages` and `?tab=reviews` are untouched.
 */
export const VENDOR_DETAIL_TABS = ['gallery', 'overview', 'packages', 'reviews'] as const;

export type VendorDetailTab = (typeof VENDOR_DETAIL_TABS)[number];
