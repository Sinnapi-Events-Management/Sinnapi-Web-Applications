'use client';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listPricingPlans } from '@/lib/queries';
import type { BillingCycle } from '@/lib/types';
import { pricingKeys } from '../../../utils/pricingQueryKeys';
import { annualSavingPercent, hasAnnualPricing, sharedTrialDays } from '../../../utils/planSummary';

/**
 * The plans section's data and interaction state, so the components below stay
 * declarative.
 *
 * One query, hydrated from the server prefetch — the cards are in the first
 * paint and this never refetches on mount. The comparison table addresses the
 * same key, so the two sections share the request and can't drift apart.
 *
 * The billing cycle is local state rather than a URL param or a second query,
 * because both prices arrive on the same row: switching cycles is a re-render
 * with zero network cost, which is what makes the toggle feel instant.
 *
 * `cycle` is what the visitor picked; `effectiveCycle` is what can actually be
 * shown. They differ only when the catalogue has no annual pricing at all — the
 * default lands on annual (it anchors the lower price), and a catalogue the
 * admin has only priced monthly must not render blank prices because of it. The
 * visitor's choice is preserved rather than overwritten, so if annual pricing
 * is added the page honours the preference on the next load.
 */
export function usePricingPlans() {
  const [cycle, setCycle] = useState<BillingCycle>('annual');

  const query = useQuery({
    queryKey: pricingKeys.plans(),
    queryFn: () => listPricingPlans(),
  });

  const plans = useMemo(() => query.data ?? [], [query.data]);
  const canBillAnnually = hasAnnualPricing(plans);

  return {
    plans,
    /** The cycle to render prices for — see the note above on why it's derived. */
    effectiveCycle: canBillAnnually ? cycle : ('monthly' as BillingCycle),
    cycle,
    setCycle,
    /** Hide the toggle entirely when there is nothing to toggle between. */
    canBillAnnually,
    savingPercent: useMemo(() => annualSavingPercent(plans), [plans]),
    trialDays: useMemo(() => sharedTrialDays(plans), [plans]),
    /** No data at all yet: render skeletons. */
    isLoading: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
}
