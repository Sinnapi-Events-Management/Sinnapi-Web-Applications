import type { PlanModel } from '@/lib/types';

/**
 * Plan features in the words vendors use (2026-11-17). The keys are database
 * values ("max_portfolio_images"); they used to be shown title-cased, which
 * read as "Max Portfolio Images" and "Search Placement".
 */
const FEATURE_LABELS: Record<string, string> = {
  search_placement: 'Clients can find you in search',
  verified_badge: 'Verified tick on your page',
  direct_messaging: 'Chat with clients on Sinnapi',
  quote_requests: 'Receive price requests',
  portfolio_video: 'Videos on your page',
  client_analytics: 'Business numbers (Analytics)',
  homepage_featured: 'Shown on the Sinnapi home page',
  account_manager: 'Your own Sinnapi helper',
};

/** One feature line, or null when the plan does not include it. */
export function featureLine(key: string, value: unknown): string | null {
  if (value === false || value === 'false') return null;
  if (key === 'max_portfolio_images') {
    const n = Number(value);
    if (n < 0) return 'Unlimited photos & videos';
    return Number.isFinite(n) && n > 0 ? `Up to ${n} photos & videos` : null;
  }
  return FEATURE_LABELS[key] ?? key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export type BillingCycle = 'monthly' | 'annual';

/**
 * The plans for one billing cycle, each carrying the features of its monthly
 * twin — features are stored on the monthly row only, which is why the yearly
 * cards used to list none.
 */
export function plansForCycle(plans: PlanModel[], cycle: BillingCycle): PlanModel[] {
  const monthlyByKey = new Map(
    plans.filter((p) => p.billing_cycle !== 'annual').map((p) => [p.key, p]),
  );
  return plans
    .filter((p) =>
      cycle === 'annual' ? p.billing_cycle === 'annual' : p.billing_cycle !== 'annual',
    )
    .map((p) => ({
      ...p,
      plan_features: p.plan_features?.length
        ? p.plan_features
        : (monthlyByKey.get(p.key)?.plan_features ?? []),
    }));
}

/** Best yearly saving across plans, as a whole percent (e.g. 20), or null. */
export function yearlySaving(plans: PlanModel[]): number | null {
  let best = 0;
  for (const a of plans.filter((p) => p.billing_cycle === 'annual')) {
    const m = plans.find((p) => p.key === a.key && p.billing_cycle !== 'annual');
    if (!m?.price || !a.price) continue;
    best = Math.max(best, 1 - Number(a.price) / (Number(m.price) * 12));
  }
  return best > 0.005 ? Math.round(best * 100) : null;
}
