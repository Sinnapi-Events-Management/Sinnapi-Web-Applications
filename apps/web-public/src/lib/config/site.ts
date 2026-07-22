// Public site config: brand, nav, route map, default metadata.

export const SITE = {
  name: 'Sinnapi',
  tagline: 'Plan your event with trusted, verified vendors',
  description:
    'Sinnapi is a trusted marketplace connecting you with authentic, verified event service providers across Uganda and beyond. Discover, compare, and book with confidence.',
  url: process.env.NEXT_CLIENT_PORTAL_URL ?? 'http://localhost:3000',
  // The authenticated portal lives in a separate app; public CTAs deep-link to it.
  vendorPortalUrl: process.env.NEXT_VENDORS_PORTAL_URL ?? '/sign-in',
  clientPortalUrl: process.env.NEXT_CLIENT_PORTAL_URL ?? '/sign-in',
};

export const PRIMARY_NAV = [
  { label: 'Vendors', href: '/vendors' },
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
 * Occasion tokens for the events grid. These are matched against
 * `events.event_type` exactly, so they must stay snake_case and in step with
 * what the admin portal writes — a label can change, a value cannot.
 */
export const EVENT_TYPES = [
  'wedding',
  'birthday',
  'corporate',
  'graduation',
  'baby_shower',
  'anniversary',
  'concert',
  'conference',
  'product_launch',
];

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
