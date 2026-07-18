import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SubscriptionAdminFilters } from '@/hooks/queries';

const PLAN_PARAM = 'plan';
const EXPIRING_PARAM = 'expiring';

/** Raw field values for the toolbar controls. */
export type SubscriptionFilterValues = {
  /** `pricing_plans.id`, or `''` for any plan. */
  planId: string;
  expiringSoon: boolean;
};

export type SubscriptionFilters = {
  values: SubscriptionFilterValues;
  setPlanId: (next: string) => void;
  setExpiringSoon: (next: boolean) => void;
  /** Typed fragment to merge into the query's `SubscriptionAdminFilters`. */
  query: Pick<SubscriptionAdminFilters, 'planId' | 'expiringSoon'>;
  /** True when plan or expiring-soon is narrowing the list. */
  isActive: boolean;
  reset: () => void;
};

/**
 * Owns the Subscriptions list' attribute filters — plan and expiring-soon —
 * mirrored into the URL so a filtered view is refresh-safe and shareable. A
 * hand-edited plan param is passed through as-is; an unknown id simply matches
 * nothing rather than erroring.
 *
 * `onChange` fires after every change — pass a page reset so filtering starts on
 * page 1 instead of a page that may no longer exist.
 */
export function useSubscriptionFilters(opts?: { onChange?: () => void }): SubscriptionFilters {
  const { onChange } = opts ?? {};
  const [searchParams, setSearchParams] = useSearchParams();

  const planId = searchParams.get(PLAN_PARAM) ?? '';
  const expiringSoon = searchParams.get(EXPIRING_PARAM) === 'true';

  const setParam = useCallback(
    (key: string, value: string) => {
      setSearchParams(
        (prev) => {
          // Rebuild from `prev` so unrelated params (search, status) survive.
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      );
      onChange?.();
    },
    [setSearchParams, onChange],
  );

  const setPlanId = useCallback((next: string) => setParam(PLAN_PARAM, next), [setParam]);
  const setExpiringSoon = useCallback(
    (next: boolean) => setParam(EXPIRING_PARAM, next ? 'true' : ''),
    [setParam],
  );

  const reset = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(PLAN_PARAM);
        next.delete(EXPIRING_PARAM);
        return next;
      },
      { replace: true },
    );
    onChange?.();
  }, [setSearchParams, onChange]);

  const query = useMemo(
    () => ({
      planId: planId || undefined,
      expiringSoon: expiringSoon || undefined,
    }),
    [planId, expiringSoon],
  );

  return {
    values: { planId, expiringSoon },
    setPlanId,
    setExpiringSoon,
    query,
    isActive: Boolean(planId || expiringSoon),
    reset,
  };
}
