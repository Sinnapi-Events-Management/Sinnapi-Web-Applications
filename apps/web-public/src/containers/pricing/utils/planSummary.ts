import type { BillingCycle, PricingPlanModel } from '@/lib/types';

/**
 * Derivations over the fetched catalogue. Kept out of the hook so each rule is
 * a pure function that can be reasoned about — and reused by the comparison
 * table — rather than a chain of `useMemo`s inside a component.
 */

/** The advertised /mo figure for a tier on a given cycle. Null when unpriced. */
export function priceFor(plan: PricingPlanModel, cycle: BillingCycle): number | null {
  return cycle === 'annual' ? plan.price_annual_monthly : plan.price_monthly;
}

/** A tier that can actually be sold on both cycles — the only kind we can compare. */
function isComparable(plan: PricingPlanModel): boolean {
  return (
    plan.price_monthly != null && plan.price_monthly > 0 && (plan.price_annual_monthly ?? 0) > 0
  );
}

/** Does any tier offer yearly billing? If not, the toggle has nothing to switch. */
export function hasAnnualPricing(plans: PricingPlanModel[]): boolean {
  return plans.some((plan) => plan.price_annual_monthly != null);
}

/**
 * Whole-number percent saved by paying yearly, for the toggle's badge.
 *
 * Read off the highlighted tier when there is one — that is the plan the page
 * is steering people toward, so it is the number they will check — falling back
 * to the first comparable tier. Null when nothing supports the claim (no annual
 * pricing, or annual isn't actually cheaper), which the badge reads as "say
 * nothing" rather than advertising a 0% saving.
 */
export function annualSavingPercent(plans: PricingPlanModel[]): number | null {
  const comparable = plans.filter(isComparable);
  const source = comparable.find((plan) => plan.highlight) ?? comparable[0];
  if (!source) return null;

  const percent = Math.round((1 - source.price_annual_monthly! / source.price_monthly!) * 100);
  return percent > 0 ? percent : null;
}

/**
 * The free-trial length to promise in the reassurance row, or null when the
 * tiers disagree.
 *
 * Quoting one tier's trial as if it were the page's offer would be a promise
 * the other tiers don't keep, so a mixed catalogue falls back to generic copy
 * instead of picking a winner.
 */
export function sharedTrialDays(plans: PricingPlanModel[]): number | null {
  const days = new Set(plans.map((plan) => plan.trial_days));
  if (days.size !== 1) return null;
  const [only] = [...days];
  return only > 0 ? only : null;
}
