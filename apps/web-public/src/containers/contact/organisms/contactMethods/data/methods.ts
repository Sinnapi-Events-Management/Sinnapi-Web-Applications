import type { ElementType } from 'react';
import { HelpOutline, SupportAgent, Storefront, Handshake } from '@mui/icons-material';
import { CONTACT } from '@sinnapi/utils/constants';

export type ContactMethod = {
  Icon: ElementType;
  title: string;
  body: string;
  /** Call-to-action label + destination (mailto / internal route). */
  actionLabel: string;
  href: string;
  /** Internal routes use the Next.js link; external/mailto open directly. */
  external?: boolean;
};

// Four routes into the right team. Email targets reuse the shared support inbox
// with a subject hint; swap for dedicated inboxes once they exist.
export const CONTACT_METHODS: ContactMethod[] = [
  {
    Icon: HelpOutline,
    title: 'General enquiries',
    body: 'Not sure where to start? Ask us anything about how Sinnapi works.',
    actionLabel: 'Email us',
    href: `mailto:${CONTACT.email}?subject=General%20enquiry`,
    external: true,
  },
  {
    Icon: SupportAgent,
    title: 'Booking support',
    body: 'Need help with a quote, payment, or an existing booking? We’ve got you.',
    actionLabel: 'Get support',
    href: `mailto:${CONTACT.email}?subject=Booking%20support`,
    external: true,
  },
  {
    Icon: Storefront,
    title: 'Become a vendor',
    body: 'Grow your event business with verified leads and secure escrow payments.',
    actionLabel: 'Apply now',
    href: '/apply',
  },
  {
    Icon: Handshake,
    title: 'Partnerships',
    body: 'Press, collaborations, or partnership ideas — let’s build something together.',
    actionLabel: 'Start a conversation',
    href: `mailto:${CONTACT.email}?subject=Partnership`,
    external: true,
  },
];
