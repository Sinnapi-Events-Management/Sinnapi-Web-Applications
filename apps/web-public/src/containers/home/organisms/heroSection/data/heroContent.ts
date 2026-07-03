export const TRUST_SIGNALS = [
  'Verified vendors',
  'Escrow-protected',
  'Quote & compare',
  'Direct messaging',
];

import type { SvgIconComponent } from '@mui/icons-material';
import { Category, Place, Star, VerifiedUser } from '@mui/icons-material';

export type Stat = { label: string; value: string; icon: SvgIconComponent };

// Pre-launch placeholder metrics — swap for live figures once data is available.
export const STATS: Stat[] = [
  { label: 'Verified vendors', value: '500+', icon: VerifiedUser },
  { label: 'Service categories', value: '12', icon: Category },
  { label: 'Regions covered', value: '8', icon: Place },
  { label: 'Avg. vendor rating', value: '4.9', icon: Star },
];
