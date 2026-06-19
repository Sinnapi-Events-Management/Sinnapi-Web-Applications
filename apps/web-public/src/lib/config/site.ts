// Public site config: brand, nav, route map, default metadata.

export const SITE = {
  name: 'Sinnapi',
  tagline: 'Plan your event with trusted, verified vendors',
  description:
    'Sinnapi is a trusted marketplace connecting you with authentic, verified event service providers across Uganda and beyond — discover, compare, and book with confidence.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  // The authenticated portal lives in a separate app; public CTAs deep-link to it.
  portalUrl: process.env.NEXT_PUBLIC_PORTAL_URL ?? '/sign-in',
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
    { label: 'Mission', href: '/mission' },
    { label: 'Vision', href: '/vision' },
    { label: 'Our Story', href: '/story' },
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
    { label: 'Privacy', href: '/privacy' },
    { label: 'Escrow Policy', href: '/escrow-policy' },
    { label: 'Vendor Terms', href: '/vendor-terms' },
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
