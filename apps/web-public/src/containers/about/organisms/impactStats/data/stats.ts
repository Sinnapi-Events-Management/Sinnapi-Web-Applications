import type { ElementType } from 'react';
import { WorkHistory, Payments, RocketLaunch, VerifiedUser } from '@mui/icons-material';

export type ImpactStat = { Icon: ElementType; value: string; label: string };

// Quantified credibility drawn from the About readMe.
export const IMPACT_STATS: ImpactStat[] = [
  {
    Icon: WorkHistory,
    value: '7+ yrs',
    label: 'In the wedding & events industry',
  },
  {
    Icon: Payments,
    value: 'UGX 300m+',
    label: 'Referred to vendors before launch',
  },
  {
    Icon: RocketLaunch,
    value: 'Mar 2026',
    label: 'Officially launched',
  },
  {
    Icon: VerifiedUser,
    value: '100%',
    label: 'Vetted & verified vendors',
  },
];
