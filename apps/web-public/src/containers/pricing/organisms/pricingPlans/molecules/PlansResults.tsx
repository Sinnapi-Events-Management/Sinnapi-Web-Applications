'use client';
import type { BillingCycle, PricingPlanModel } from '@/lib/types';
import { PlansGrid, PlansGridSkeleton } from './PlansGrid';
import { PlansEmpty, PlansError } from './PlansFallback';

type PlansResultsProps = {
  plans: PricingPlanModel[];
  cycle: BillingCycle;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
};

/**
 * Picks the section's state — skeletons, error, empty, or cards — and nothing
 * else. Each branch lives in its own component so this stays a readable
 * decision.
 *
 * Branch order matters: an error must win over "empty", or a failed request
 * reads to the visitor as a company that has stopped selling subscriptions.
 */
export default function PlansResults({
  plans,
  cycle,
  isLoading,
  isError,
  onRetry,
}: PlansResultsProps) {
  if (isLoading) return <PlansGridSkeleton />;
  if (isError && plans.length === 0) return <PlansError onRetry={onRetry} />;
  if (plans.length === 0) return <PlansEmpty />;

  return <PlansGrid plans={plans} cycle={cycle} />;
}
