import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PlanModel } from '@/lib/types';
import { toWritePayload, type PlanFormValues } from '../schema';

/** Postgres unique-violation — `unique (key, billing_cycle)` raises it here. */
const UNIQUE_VIOLATION = '23505';

export type PlanDrawerMode = 'create' | 'edit';

/**
 * Owns the plan drawer, shared between create and edit. A list row already
 * carries every editable field, so editing needs no extra fetch — the row is
 * handed straight to the form. Create opens the same drawer with a blank form.
 */
export function usePlanEdit() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<PlanModel | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const openCreate = useCallback(() => {
    setErr(null);
    setEditing(null);
    setCreating(true);
  }, []);

  const openEdit = useCallback((plan: PlanModel) => {
    setErr(null);
    setCreating(false);
    setEditing(plan);
  }, []);

  const close = useCallback(() => {
    setEditing(null);
    setCreating(false);
    setErr(null);
  }, []);

  /** Inserts or updates the plan. Returns true on success so the drawer can close itself. */
  const save = useCallback(
    async (values: PlanFormValues): Promise<boolean> => {
      setBusy(true);
      setErr(null);
      const payload = toWritePayload(values);
      const { error } = editing
        ? await supabase.from('pricing_plans').update(payload).eq('id', editing.id)
        : await supabase.from('pricing_plans').insert(payload);
      setBusy(false);
      if (error) {
        setErr(
          error.code === UNIQUE_VIOLATION
            ? 'A plan with that key and billing cycle already exists. Change the key or the cycle.'
            : error.message,
        );
        return false;
      }
      const editedId = editing?.id;
      close();
      qc.invalidateQueries({ queryKey: ['admin-plans'] });
      qc.invalidateQueries({ queryKey: ['pricing-plan-options'] });
      if (editedId) qc.invalidateQueries({ queryKey: ['plan', editedId] });
      return true;
    },
    [editing, qc, close],
  );

  return {
    isOpen: creating || !!editing,
    mode: (creating ? 'create' : 'edit') as PlanDrawerMode,
    plan: editing,
    busy,
    err,
    openCreate,
    openEdit,
    close,
    save,
  };
}
