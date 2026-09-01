import { useVendorContext } from '@/vendor/VendorProvider';
import { usePlans } from '@/hooks/queries';

/**
 * Whether the vendor's current plan carries a `plan_features` entitlement.
 *
 * The flags are seeded per plan (`client_analytics`, `homepage_featured`, …)
 * and `plan_features` is world-readable, so this resolves from the plans query
 * the subscription page already warms rather than adding a read of its own.
 *
 * A trial resolves against whichever plan the trial was opened on, which is the
 * same rule the subscription page states: a trial is the plan, not a tier of
 * its own.
 *
 * Returns `false` while plans are still loading. Callers use it to *withhold* a
 * paid surface, and briefly showing an upgrade prompt is the safe direction to
 * be wrong in — the alternative flashes a feature the vendor has not paid for.
 */
export function usePlanFeature(featureKey: string): { enabled: boolean; loading: boolean } {
  const { subscription } = useVendorContext();
  const { data: plans, isLoading } = usePlans();

  const plan = plans?.find((p) => p.id === subscription?.plan_id);
  const raw = plan?.plan_features?.find((f) => f.feature_key === featureKey)?.value;
  // `value` is jsonb, so a boolean flag can arrive as either `true` or `"true"`.
  const enabled = raw === true || raw === 'true';

  return { enabled, loading: isLoading };
}
