import type { ElementType } from 'react';
import {
  Public,
  NearMe,
  Verified,
  PhotoLibrary,
  WorkspacePremium,
  Lock,
  Hub,
} from '@sinnapi/ui/icons';

export type Reason = { Icon: ElementType; title: string; body: string };

// The five reasons from the About readMe, plus two more grounded in the
// platform's escrow + all-in-one coordination (drafted for review).
export const REASONS: Reason[] = [
  {
    Icon: Public,
    title: 'Maximum visibility',
    body: 'As a vendor, you are seen by customers across the globe and in your local region — keeping a continuous flow of business throughout the year.',
  },
  {
    Icon: NearMe,
    title: 'Close proximity',
    body: 'As a consumer, you connect with trusted service providers nearest to you, quickening service delivery and saving your time.',
  },
  {
    Icon: Verified,
    title: 'Verified vendors',
    body: 'Every provider is thoroughly vetted — we check business registrations, portfolios, and client testimonials so you work only with the best.',
  },
  {
    Icon: PhotoLibrary,
    title: 'Complete portfolios',
    body: 'View detailed portfolios, real event photos, and authentic reviews. Decide with confidence through transparent pricing and full vendor profiles.',
  },
  {
    Icon: WorkspacePremium,
    title: 'Quality guarantee',
    body: 'We stand behind our vendors with quality guarantees and dedicated support. Your satisfaction is our priority throughout your event journey.',
  },
  // --- Two additional reasons (drafted) ---
  {
    Icon: Lock,
    title: 'Secure escrow payments',
    body: 'Your money stays protected. Funds are held safely in escrow and only released to the vendor once you confirm the service was delivered as promised.',
  },
  {
    Icon: Hub,
    title: 'Everything in one place',
    body: 'From discovery and quotations to direct messaging and booking, coordinate every part of your event in one home — no endless back-and-forth.',
  },
];
