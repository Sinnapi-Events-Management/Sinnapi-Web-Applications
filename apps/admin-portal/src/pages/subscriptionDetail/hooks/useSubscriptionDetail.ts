import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useSubscriptionAdmin } from '@/hooks/queries';

/**
 * One subscription as the console reads it. Owns the single read and the
 * one fact the page derives from it: how many payments actually went
 * through — the badge on the payments tab, and the number Finance opened
 * the page to check.
 */
export function useSubscriptionDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const { data, isLoading, error } = useSubscriptionAdmin(id);

  const subscription = data ?? null;
  const succeededPayments = useMemo(
    () => subscription?.payments.filter((p) => p.status === 'succeeded').length ?? 0,
    [subscription],
  );

  return { id, subscription, isLoading, error, succeededPayments };
}
