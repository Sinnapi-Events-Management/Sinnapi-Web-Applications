/**
 * The element the fixed mobile action bar watches: the sidebar card's pair of
 * buttons.
 *
 * An `id` rather than a ref, because the two live on opposite sides of the
 * server/client boundary. `VendorDetailSidebar` is a server component — it has
 * to be, so the card and its price are in the prerendered HTML — and a server
 * component cannot hold a ref. The bar looks the node up after mount, the same
 * way `useStickyHeaderOffset` finds the navbar it pins itself under.
 *
 * Shared from here so the two sides cannot drift apart silently: a typo in one
 * of two string literals would simply mean a bar that never appears.
 */
export const VENDOR_CTA_ANCHOR_ID = 'vendor-inline-cta';
