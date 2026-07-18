import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PlanModel } from '@/lib/types';

/** The plan awaiting delete confirmation. */
export type PendingPlanDelete = {
  id: string;
  name: string;
};

/** Postgres foreign-key violation — raised when subscriptions still reference the plan. */
const FK_VIOLATION = '23503';

/**
 * Owns the confirm-then-delete flow. Unlike vendors, `pricing_plans` has no
 * `deleted_at` column, so this is a hard delete: the plan's `plan_features`
 * cascade away, but the `subscriptions.plan_id` foreign key blocks the delete
 * while any subscription still points at the plan — surfaced as guidance to
 * deactivate instead.
 */
export function usePlanDelete(onDeleted?: () => void) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingPlanDelete | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const request = useCallback((plan: PlanModel) => {
    setErr(null);
    setPending({ id: plan.id, name: plan.name });
  }, []);

  const cancel = useCallback(() => {
    setPending(null);
  }, []);

  const confirm = useCallback(async () => {
    if (!pending) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from('pricing_plans').delete().eq('id', pending.id);
    setBusy(false);
    if (error) {
      setErr(
        error.code === FK_VIOLATION
          ? 'This plan has subscriptions attached, so it can’t be deleted. Deactivate it instead.'
          : error.message,
      );
      return;
    }
    setPending(null);
    qc.invalidateQueries({ queryKey: ['admin-plans'] });
    qc.invalidateQueries({ queryKey: ['pricing-plan-options'] });
    onDeleted?.();
  }, [pending, qc, onDeleted]);

  return { pending, busy, err, request, cancel, confirm };
}
