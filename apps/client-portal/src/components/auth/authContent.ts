import SearchIcon from '@mui/icons-material/Search';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CelebrationIcon from '@mui/icons-material/Celebration';
import type { AuthShowcaseSlide } from '@sinnapi/ui';

// Copy for the client auth showcase (left panel). Client-oriented value props —
// discovery, quotations, escrow and planning — deliberately distinct from the
// admin portal's operations language.
//
// NOTE: the trust pills are qualitative on purpose. Swap them for real figures
// (vendor counts, events delivered) once marketing signs off on the numbers.
export const AUTH_SLIDES: AuthShowcaseSlide[] = [
  {
    title: 'Every vendor, one place',
    body: 'Search verified caterers, venues, décor and photographers by category, region and budget — no more chasing referrals across WhatsApp.',
    icon: SearchIcon,
    stats: ['Verified vendors', 'Search by region'],
  },
  {
    title: 'Quotes you can compare',
    body: 'Request quotations from several vendors at once, then put them side by side — pricing, inclusions and availability in a single view.',
    icon: RequestQuoteIcon,
    stats: ['Side-by-side quotes', 'Free to request'],
  },
  {
    title: 'Pay protected, not upfront',
    body: 'Your payment is held in escrow and released only once you confirm the service was delivered. Mobile money or card, in UGX or USD.',
    icon: AccountBalanceIcon,
    stats: ['Escrow-protected', 'MoMo, Airtel & card'],
  },
  {
    title: 'Your whole event, tracked',
    body: 'Bookings, messages, payments and reviews for every vendor you hire — organised per event, from first enquiry to the final thank-you.',
    icon: CelebrationIcon,
    stats: ['One timeline per event', 'Chat with vendors'],
  },
];

export const AUTH_ROTATE_MS = 6000;
