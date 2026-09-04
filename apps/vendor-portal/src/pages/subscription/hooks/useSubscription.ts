import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeRefresh } from '@sinnapi/ui/data';
import { supabase } from '@/lib/supabase';
import {
  useMySubscription,
  usePlans,
  useSubscriptionPayments,
  useSubscriptionEvents,
} from '@/hooks/queries';
import type { PlanModel } from '@/lib/types';
import { planActionLabel } from '../schema';

/**
 * The subscription page: where the vendor stands, what they can buy, and
 * the checkout they have opened.
 *
 * There is no "choose plan" call any more. Every plan change — new, renewal,
 * upgrade, downgrade, reactivation — is a payment, and the plan only takes
 * effect when that payment succeeds. This hook owns which plan the vendor is
 * about to pay for; `useSubscriptionCheckout` owns the pricing and the rail.
 */
export function useSubscription(vendorId: string) {
  const qc = useQueryClient();
  const subscription = useMySubscription(vendorId);
  const plans = usePlans();
  const payments = useSubscriptionPayments(subscription.data?.id);
  const events = useSubscriptionEvents(subscription.data?.id);

  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['my-subscription-detail', vendorId] });
    void qc.invalidateQueries({ queryKey: ['my-subscription'] });
    void qc.invalidateQueries({ queryKey: ['my-vendor'] });
    void qc.invalidateQueries({ queryKey: ['subscription-payments'] });
    void qc.invalidateQueries({ queryKey: ['subscription-events'] });
  }, [qc, vendorId]);

  // A payment settling while the page is open flips the status card and the
  // history without a reload — the IPN lands on its own clock.
  useRealtimeRefresh({
    client: supabase,
    channel: `subscription:${vendorId}`,
    enabled: !!vendorId,
    onChange: refresh,
    watch: useMemo(
      () => [
        { table: 'subscriptions', filter: `vendor_id=eq.${vendorId}` },
        ...(subscription.data?.id
          ? [{ table: 'payments', filter: `subscription_id=eq.${subscription.data.id}` }]
          : []),
      ],
      [vendorId, subscription.data?.id],
    ),
  });

  const checkoutPlan: PlanModel | null = useMemo(
    () => (plans.data ?? []).find((p) => p.id === checkoutPlanId) ?? null,
    [plans.data, checkoutPlanId],
  );

  return {
    subscription: subscription.data ?? null,
    isSubscriptionLoading: subscription.isLoading,
    subscriptionError: subscription.error,
    plans,
    payments: payments.data ?? [],
    isPaymentsLoading: !!subscription.data?.id && payments.isLoading,
    events: events.data ?? [],
    /** Button copy per plan, given the vendor's current standing. */
    actionLabel: (planId: string) => planActionLabel(planId, subscription.data ?? null),
    /** The plan whose confirmation dialog is open, or null. */
    checkoutPlan,
    openCheckout: (planId: string) => setCheckoutPlanId(planId),
    closeCheckout: () => setCheckoutPlanId(null),
  };
}
