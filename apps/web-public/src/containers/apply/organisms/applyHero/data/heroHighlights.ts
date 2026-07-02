import type { ElementType } from 'react';
import { Payments, VerifiedUser, RocketLaunch } from '@sinnapi/ui/icons';

export type HeroHighlight = { Icon: ElementType; value: string; label: string };

/**
 * Floating proof cards laid over the hero collage. Figures are the same factual
 * credibility points used across the marketing site (see the About impact band),
 * reframed for a vendor audience.
 */
export const HERO_HIGHLIGHTS: HeroHighlight[] = [
  { Icon: Payments, value: 'UGX 300m+', label: 'Referred to vendors pre-launch' },
  { Icon: VerifiedUser, value: '100%', label: 'Vetted & verified marketplace' },
  { Icon: RocketLaunch, value: '30 days', label: 'Free trial, no card required' },
];

// Inline trust chips beneath the hero copy — quick, scannable reassurance.
export const HERO_TRUST: string[] = [
  'Verified vendor profiles',
  'Secure escrow payouts',
  'No commission surprises',
];
