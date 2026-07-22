import { Grid, Paper, Skeleton, Stack } from '@sinnapi/ui/atoms';
import type { BillingCycle, PricingPlanModel } from '@/lib/types';
import PlanCard from './PlanCard';

/** Breakpoint spans, shared by the real grid and its skeleton so they align. */
const SPAN = { xs: 12, md: 4 } as const;

/** The plan cards. `alignItems="stretch"` is what lines the CTAs up. */
export function PlansGrid({ plans, cycle }: { plans: PricingPlanModel[]; cycle: BillingCycle }) {
  return (
    <Grid container spacing={3} alignItems="stretch">
      {plans.map((plan) => (
        <Grid item {...SPAN} key={plan.key}>
          <PlanCard plan={plan} cycle={cycle} />
        </Grid>
      ))}
    </Grid>
  );
}

/**
 * First-load placeholder, shaped like a plan card — heading, price, button,
 * feature list — so the section settles at roughly its real height instead of
 * growing under the visitor when the catalogue lands.
 *
 * Three is the catalogue's usual size; a wrong guess costs a little reflow,
 * whereas rendering nothing costs the whole section's height.
 */
export function PlansGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Grid container spacing={3} alignItems="stretch">
      {Array.from({ length: count }, (_, index) => (
        <Grid item {...SPAN} key={index}>
          <Paper variant="outlined" sx={{ p: { xs: 3, md: 3.5 }, borderRadius: 3, height: '100%' }}>
            <Skeleton variant="text" width="45%" height={32} />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="60%" height={56} sx={{ mt: 2 }} />
            <Skeleton variant="rounded" height={42} sx={{ mt: 2.5 }} />
            <Stack spacing={1} sx={{ mt: 3 }}>
              {Array.from({ length: 5 }, (_, row) => (
                <Skeleton key={row} variant="text" width={`${85 - row * 6}%`} />
              ))}
            </Stack>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
