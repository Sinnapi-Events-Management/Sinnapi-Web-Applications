import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toPromotionValues, toPromotionInsert, type PromotionRow } from '../schema';

/** A destructive step, held until the vendor confirms it. */
export type PendingPromotionAction = { kind: 'delete'; promotion: PromotionRow } | null;

/**
 * Everything a vendor can do to a campaign that is not editing its copy.
 *
 * Separate from `usePromotions` because an action's in-flight state belongs to
 * one card while the filter and the join belong to the whole page — one hook
 * holding both would re-render every card whenever any of them was touched.
 *
 * Only delete asks for confirmation. Pausing and resuming are one click to
 * undo and the card says which state it is in; a delete is neither, and the
 * campaigns this is reached from are the ones a vendor has spent money behind.
 */
export function usePromotionActions(vendorId: string) {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingPromotionAction>(null);

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['v-promotions', vendorId] });
  }, [qc, vendorId]);

  /** Runs one write against a single card, reporting through that card's spinner. */
  const run = useCallback(
    async (id: string, write: () => PromiseLike<{ error: { message: string } | null }>) => {
      setBusyId(id);
      setError(null);

      const { error: writeError } = await write();
      setBusyId(null);

      if (writeError) {
        setError(writeError.message);
        return false;
      }
      refresh();
      return true;
    },
    [refresh],
  );

  /**
   * Pause and resume are the same write, because `is_active` is the only thing
   * that separates them — the dates stay exactly as the vendor set them, so
   * resuming a campaign mid-window puts it straight back in front of clients
   * rather than restarting its run.
   */
  const setActive = useCallback(
    (promotion: PromotionRow, active: boolean) =>
      run(promotion.id, () =>
        supabase.from('promotions').update({ is_active: active }).eq('id', promotion.id),
      ),
    [run],
  );

  /**
   * A copy, deliberately paused.
   *
   * Duplicating is how a vendor reruns last season's campaign, and the one
   * thing they always change is the window. Landing the copy live on the old
   * dates would either publish a campaign that already ended or quietly run one
   * they had not finished writing, so it arrives switched off and titled as a
   * copy — visible, editable, and not yet in front of anyone.
   */
  const duplicate = useCallback(
    (promotion: PromotionRow) =>
      run(promotion.id, () =>
        supabase.from('promotions').insert({
          ...toPromotionInsert(
            { ...toPromotionValues(promotion), title: `${promotion.title} (copy)`.slice(0, 140) },
            vendorId,
          ),
          is_active: false,
        }),
      ),
    [run, vendorId],
  );

  const requestDelete = useCallback((promotion: PromotionRow) => {
    setError(null);
    setPending({ kind: 'delete', promotion });
  }, []);

  const cancelPending = useCallback(() => setPending(null), []);

  /**
   * Removal is a soft delete, not a `DELETE`.
   *
   * The row carries `deleted_at`/`deleted_by` and every read already filters on
   * it, so stamping it hides the campaign exactly as a hard delete would while
   * leaving the discounts that pointed at it — and the bookings those codes
   * priced — with their history intact.
   */
  const confirmPending = useCallback(async () => {
    if (!pending) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const ok = await run(pending.promotion.id, () =>
      supabase
        .from('promotions')
        .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null })
        .eq('id', pending.promotion.id),
    );
    if (ok) setPending(null);
  }, [pending, run]);

  return {
    /** The campaign currently mid-write, so one card can spin without the grid. */
    busyId,
    error,
    dismissError: () => setError(null),
    pending,
    setActive,
    duplicate,
    requestDelete,
    cancelPending,
    confirmPending,
  };
}
