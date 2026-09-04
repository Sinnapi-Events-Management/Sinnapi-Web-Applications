import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { usePaymentAdmin } from '@/hooks/queries';
import { useAdmin } from '@/admin/AdminProvider';

/** Exception statuses still waiting on a human. */
const OPEN = new Set(['open', 'investigating']);

/**
 * One payment as the console investigates it. Owns the single read and the
 * two facts the page derives from it: whether this admin may *work* an
 * exception (as opposed to reading one), and how many are still open — the
 * badge on the exceptions tab, and the reason an investigator opened the page.
 */
export function usePaymentDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const { has } = useAdmin();
  const { data, isLoading, error } = usePaymentAdmin(id);

  const payment = data ?? null;
  const openExceptions = useMemo(
    () => payment?.exceptions?.filter((x) => OPEN.has(x.status)).length ?? 0,
    [payment],
  );

  return {
    id,
    payment,
    isLoading,
    error,
    canReconcile: has('finance.reconcile'),
    openExceptions,
  };
}
