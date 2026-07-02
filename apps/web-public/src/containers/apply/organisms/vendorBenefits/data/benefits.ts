import type { ElementType } from 'react';
import {
  Storefront,
  Campaign,
  AccountBalanceWallet,
  CalendarMonth,
  WorkspacePremium,
  SupportAgent,
} from '@sinnapi/ui/icons';

export type Benefit = { Icon: ElementType; title: string; body: string };

// Why an event vendor should sell on Sinnapi — the marketplace value proposition.
export const BENEFITS: Benefit[] = [
  {
    Icon: Storefront,
    title: 'A storefront that sells for you',
    body: 'A verified profile with your media, packages and reviews — built to turn browsers into paying bookings.',
  },
  {
    Icon: Campaign,
    title: 'Reach ready-to-book clients',
    body: 'Get discovered by couples and planners actively searching for services like yours, not just followers.',
  },
  {
    Icon: AccountBalanceWallet,
    title: 'Get paid securely',
    body: 'Escrow protects every transaction — funds are released once the client confirms, so you never chase payments.',
  },
  {
    Icon: CalendarMonth,
    title: 'Manage bookings in one place',
    body: 'Enquiries, quotes and confirmed events in a single dashboard — no more scattered DMs and lost threads.',
  },
  {
    Icon: WorkspacePremium,
    title: 'Stand out as verified',
    body: 'Our vetting badge signals trust, helping you win clients over unverified competitors.',
  },
  {
    Icon: SupportAgent,
    title: 'Grow with real support',
    body: 'Onboarding guidance, visibility tools and a team genuinely invested in growing your business.',
  },
];
