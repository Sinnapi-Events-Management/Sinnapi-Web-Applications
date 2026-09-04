import { Alert, Box, Grid, PageTitle, QueryState, Stack } from '@sinnapi/ui';
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

  const plans = s.plans.data ?? [];
  const currentPlanId = s.subscription?.plan_id ?? null;
  const renewTarget =
    currentPlanId ?? plans.find((p) => p.key === 'professional')?.id ?? plans[0]?.id;

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

      <QueryState isLoading={s.plans.isLoading} error={s.plans.error}>
        <Grid container spacing={3} alignItems="stretch">
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
        subtitle="Pay for the plan you want. Your listing stays public while a paid period is running."
      />
      <VendorGate>{(vendorId) => <SubscriptionBody vendorId={vendorId} />}</VendorGate>
    </>
  );
}
