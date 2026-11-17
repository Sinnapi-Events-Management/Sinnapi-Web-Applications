import { useState } from 'react';
import {
  Alert,
  Box,
  Grid,
  PageTitle,
  QueryState,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@sinnapi/ui';
import { plansForCycle, yearlySaving, type BillingCycle } from './schema/planFeatures';
import VendorGate from '@/vendor/VendorGate';
import { useSubscription } from './hooks/useSubscription';
import CurrentPlanCard from './components/organisms/CurrentPlanCard';
import PlanCard from './components/organisms/PlanCard';
import PaymentHistoryCard from './components/organisms/PaymentHistoryCard';
import SubscriptionCheckoutDialog from './components/organisms/SubscriptionCheckoutDialog';

/**
 * The vendor's subscription: where they stand, the plans on offer, and the
 * payments they have made.
 *
 * Every plan card's action opens a confirmation showing the priced preview
 * — plan, cycle, amount, the period it buys and what happens to the current
 * one — then a rail picker, then the hosted checkout. Nothing changes on the
 * subscription until the provider confirms the money. Layout only;
 * `useSubscription` owns the data and which checkout is open.
 */
function SubscriptionBody({ vendorId }: { vendorId: string }) {
  const s = useSubscription(vendorId);

  const allPlans = s.plans.data ?? [];
  const currentPlanId = s.subscription?.plan_id ?? null;
  const currentCycle: BillingCycle =
    allPlans.find((p) => p.id === currentPlanId)?.billing_cycle === 'annual' ? 'annual' : 'monthly';
  // One card per plan with a monthly/yearly switch (decided 2026-11-17); the
  // page used to show every plan twice. Starts on the cycle you pay now.
  const [cycleChoice, setCycle] = useState<BillingCycle | null>(null);
  const cycle = cycleChoice ?? currentCycle;
  const plans = plansForCycle(allPlans, cycle);
  const saving = yearlySaving(allPlans);
  const renewTarget =
    currentPlanId ?? allPlans.find((p) => p.key === 'professional')?.id ?? allPlans[0]?.id;

  return (
    <Stack spacing={3}>
      {s.subscriptionError && (
        <Alert severity="error">
          {s.subscriptionError instanceof Error
            ? s.subscriptionError.message
            : 'Your subscription could not be loaded.'}
        </Alert>
      )}

      <CurrentPlanCard
        subscription={s.subscription}
        isLoading={s.isSubscriptionLoading}
        onRenew={() => renewTarget && s.openCheckout(renewTarget)}
      />

      <ToggleButtonGroup
        exclusive
        value={cycle}
        onChange={(_, v: BillingCycle | null) => v && setCycle(v)}
        aria-label="How often you pay"
        fullWidth
        sx={{
          maxWidth: 420,
          '& .MuiToggleButton-root': {
            minHeight: 44,
            px: 1,
            textTransform: 'none',
            whiteSpace: 'nowrap',
          },
        }}
      >
        <ToggleButton value="monthly">Pay monthly</ToggleButton>
        <ToggleButton value="annual">Pay yearly{saving ? ` (save ${saving}%)` : ''}</ToggleButton>
      </ToggleButtonGroup>

      <QueryState isLoading={s.plans.isLoading} error={s.plans.error}>
        {/* The Box matters: the page's Stack zeroes its children's margins,
            which cancels the Grid's negative left margin and pushes every plan
            card off the right edge of a phone. */}
        <Box>
          <Grid container spacing={{ xs: 2, md: 3 }} alignItems="stretch">
            {plans.map((p) => (
              <Grid item xs={12} md={4} key={p.id}>
                <PlanCard
                  plan={p}
                  isCurrent={p.id === currentPlanId && s.subscription?.status === 'active'}
                  highlight={p.key === 'professional'}
                  actionLabel={s.actionLabel(p.id)}
                  onAction={() => s.openCheckout(p.id)}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      </QueryState>

      <Box sx={{ maxWidth: 760 }}>
        <PaymentHistoryCard payments={s.payments} isLoading={s.isPaymentsLoading} />
      </Box>

      <SubscriptionCheckoutDialog
        open={!!s.checkoutPlan}
        onClose={s.closeCheckout}
        vendorId={vendorId}
        plan={s.checkoutPlan}
      />
    </Stack>
  );
}

export default function Subscription() {
  return (
    <>
      <PageTitle
        title="Subscription"
        subtitle="Your plan keeps your page visible to clients. Pay monthly or yearly."
      />
      <VendorGate>{(vendorId) => <SubscriptionBody vendorId={vendorId} />}</VendorGate>
    </>
  );
}
