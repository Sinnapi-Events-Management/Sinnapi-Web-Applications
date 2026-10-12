// Public site config: brand, nav, route map, default metadata.

export const SITE = {
  name: 'Sinnapi',
  tagline: 'Plan your event with trusted, verified vendors',
  description:
    'Sinnapi is a trusted marketplace connecting you with authentic, verified event service providers across Uganda and beyond. Discover, compare, and book with confidence.',
  /**
   * This site's own canonical origin — `metadataBase`, `robots.txt`, the
   * sitemap, OpenGraph and the JSON-LD on every vendor and event page.
   *
   * It used to read `NEXT_CLIENT_PORTAL_URL`, which is the *portal's* origin,
   * so every canonical URL this site published named `clients.sinnapi.com`
   * instead of itself. In dev the mistake was invisible: the example env set
   * that variable to `:3000`, which is this app's own port, and the two values
   * happened to coincide. Set `NEXT_PUBLIC_SITE_URL` per environment.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  // The authenticated portal lives in a separate app; public CTAs deep-link to it.
  vendorPortalUrl: process.env.NEXT_VENDORS_PORTAL_URL ?? '/sign-in',
  clientPortalUrl: process.env.NEXT_CLIENT_PORTAL_URL ?? '/sign-in',
};

/**
 * Which section of the portal's vendor profile to open on arrival. Mirrors
 * `VENDOR_DETAIL_TABS` in the client portal, where `overview` is the default
 * and is represented by the *absence* of the parameter.
 */
export type ClientPortalVendorTab =
  | 'packages'
  | 'offers'
  | 'portfolio'
  | 'availability'
  | 'reviews';

/**
 * Where a gated CTA on a public vendor profile sends the visitor: the *same*
 * vendor's profile in the client portal.
 *
 * This is the one place the cross-app hop is spelled out, because the public
 * site cannot answer "is this visitor signed in" and must not pretend to. The
 * portal is a separate origin (`clients.sinnapi.com`) holding its PKCE session
 * in its own `localStorage`, and this site's Supabase client is deliberately
 * stateless — `persistSession: false` — so that every vendor page can stay
 * static. There is nothing here to read.
 *
 * So the branch is delegated rather than duplicated. The destination is a
 * protected route, and the portal already owns both halves of the answer:
 * `ProtectedRoute` sends a signed-out arrival to `/sign-in?returnTo=<path>`,
 * and its sign-in page lands them back on that path once the session is
 * admitted. A signed-in visitor simply arrives. The public CTA therefore links
 * to the destination, not to a login — which is also why it no longer points
 * at this site's `/sign-in`, a role chooser that threw the vendor away and left
 * the reader to find them again from the portal's own directory.
 *
 * Falls back to that role chooser when `NEXT_CLIENT_PORTAL_URL` is unset:
 * better the old behaviour than a link built on a missing origin. That
 * fallback is the reason callers pair this with `isExternalHref` before
 * applying `NEW_TAB_LINK_PROPS` — the happy path opens a new tab, the fallback
 * must not.
 *
 * Server-only, because the variable has no `NEXT_PUBLIC_` prefix and so is not
 * in the browser bundle. Client components on this page (the package cards and
 * the offers strip) take the resolved URL as a prop from the server container
 * rather than calling this — reading `process.env` there returns `undefined`
 * and would silently degrade every one of those CTAs to the fallback.
 */
export function clientPortalVendorUrl(slug: string, tab?: ClientPortalVendorTab): string {
  const origin = process.env.NEXT_CLIENT_PORTAL_URL?.replace(/\/+$/, '');
  if (!origin) return '/sign-in';
  const query = tab ? `?tab=${tab}` : '';
  return `${origin}/discover/vendors/${encodeURIComponent(slug)}${query}`;
}

/**
 * What a cross-origin CTA needs on top of its `href`.
 *
 * `noopener` is the one that matters: without it the portal tab gets a
 * `window.opener` handle back into this page and can navigate it. `noreferrer`
 * goes with it rather than against it — the portal has no use for the
 * referrer, and the two are conventionally paired so neither is forgotten.
 *
 * Plain data, deliberately, so this module stays free of React and remains
 * importable from both runtimes.
 */
export const NEW_TAB_LINK_PROPS = { target: '_blank', rel: 'noopener noreferrer' } as const;

/**
 * Whether a resolved CTA href left this origin.
 *
 * The one caller-visible consequence of `clientPortalVendorUrl` degrading to
 * `/sign-in`: the portal links open in a new tab, but that fallback is a page
 * on *this* site, and new-tabbing an internal route strands the reader with two
 * tabs of the same site and no client-side navigation. So the new-tab
 * attributes are conditional, and this is the single predicate that decides it
 * — rather than four call sites each re-deciding what "external" means.
 */
export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export const PRIMARY_NAV = [
  { label: 'Vendors', href: '/vendors' },
  // Second, beside Vendors: both answer "who should I book", and a visitor
  // shopping on price is doing the same job as one browsing — from the other
  // end. Ahead of Events because an offer has a deadline and an event listing
  // does not.
  { label: 'Offers', href: '/offers' },
  { label: 'Events', href: '/events' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export const FOOTER_NAV = {
  Company: [
    { label: 'About', href: '/about' },
    // Mission / Vision / Story now live as sections on the About page; these
    // deep-link there. The legacy /mission, /vision, /story routes 308-redirect
    // to the same anchors (see next.config.mjs) so old URLs keep working.
    { label: 'Mission', href: '/about#mission' },
    { label: 'Vision', href: '/about#vision' },
    { label: 'Our Story', href: '/about#story' },
    { label: 'Contact', href: '/contact' },
  ],
  Marketplace: [
    { label: 'Browse Vendors', href: '/vendors' },
    { label: 'Offers & discounts', href: '/offers' },
    { label: 'Events', href: '/events' },
    { label: 'Become a Vendor', href: '/apply' },
    { label: 'Pricing', href: '/pricing' },
  ],
  Legal: [
    { label: 'Terms', href: '/terms' },
    { label: 'Client Terms', href: '/client-event-planner-terms' },
    { label: 'Vendor Terms', href: '/vendor-terms' },
    { label: 'Escrow Policy', href: '/escrow-policy' },
    { label: 'Privacy', href: '/privacy' },
  ],
};

export const VENDOR_CATEGORIES = [
  'photographer',
  'videographer',
  'decorator',
  'caterer',
  'makeup_artist',
  'mc',
  'dj',
  'venue',
  'florist',
  'security',
  'entertainment',
  'equipment',
];

export const SERVICE_REGIONS = [
  'kampala',
  'central',
  'eastern',
  'western',
  'northern',
  'nationwide',
  'east_africa',
  'international',
];

/**
 * Occasions are deliberately not listed here. They live in the `event_types`
 * table an admin manages (migration 20260814000001) and are fetched by the
 * events page — `getEventTypes` in `lib/queries`. The hardcoded copy that used
 * to sit here had already drifted from what the portals write, offering
 * `corporate`, `concert` and `product_launch` (which nothing has ever written)
 * while missing `introduction`, `company_event` and `fundraising`.
 */

/**
 * Towns the events grid offers as a location facet.
 *
 * Separate from `SERVICE_REGIONS` on purpose: a vendor's coverage is a
 * normalised reference row, whereas `events.location` is free text a poster
 * typed, so these are matched by containment ("kampala" finds "Kampala,
 * Uganda"). This list is also what `count_event_facets_public` counts against —
 * the RPC cannot group free text into sensible options on its own.
 */
export const EVENT_LOCATIONS = [
  'kampala',
  'entebbe',
  'jinja',
  'mukono',
  'wakiso',
  'mbarara',
  'gulu',
  'nationwide',
];

export function formatMoney(amount: number | null, currency: string | null): string | null {
  if (amount == null) return null;
  const cur = currency ?? 'UGX';
  try {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: cur === 'UGX' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${cur} ${amount.toLocaleString()}`;
  }
}

export function titleize(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
