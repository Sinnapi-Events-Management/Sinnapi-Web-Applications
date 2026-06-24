import { unsplash } from '@/lib/images';

/** Full-bleed Ken Burns background behind the hero. */
export const HERO_IMAGE = unsplash('1519225421980-715cb0215aed', 1920);

export const TRUST_SIGNALS = [
  'Verified vendors',
  'Escrow-protected',
  'Quote & compare',
  'Direct messaging',
];

export type Stat = { label: string; value: string };

// Pre-launch placeholder metrics — swap for live figures once data is available.
export const STATS: Stat[] = [
  { label: 'Verified vendors', value: '500+' },
  { label: 'Service categories', value: '12' },
  { label: 'Regions covered', value: '8' },
  { label: 'Avg. vendor rating', value: '4.9' },
];
