import type { AuthShowcaseSlide } from '@sinnapi/ui';
import { FEATURES } from '@sinnapi/utils/constants';

// Copy for the vendor auth showcase (left panel). Vendor-oriented value props —
// winning work, getting paid and growing the listing — deliberately distinct
// from the admin console's operations language and the client portal's
// discovery language, even though all three share one showcase treatment.
export const AUTH_SLIDES: AuthShowcaseSlide[] = [
  {
    title: 'Win More Bookings',
    body: FEATURES.clientVendorMessaging
      ? 'Quotation requests, bookings and client messages arrive in one inbox — no more losing work to a missed WhatsApp reply.'
      : 'Quotation requests and bookings stay organized in one place, with clear updates as work moves forward.',
  },
  {
    title: 'Get Paid, Guaranteed',
    body: 'Client payments are held in escrow before the event and released to your payout account once the service is delivered.',
  },
  {
    title: 'Grow Your Business',
    body: 'Publish services and portfolio work, run promotions and discounts, and watch what converts in your analytics.',
  },
];

export const AUTH_ROTATE_MS = 6000;
