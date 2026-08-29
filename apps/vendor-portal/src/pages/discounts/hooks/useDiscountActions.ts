import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  discountWriteMessage,
  toDiscountInsert,
  toDiscountValues,
  toDuplicateCode,
  type DiscountRow,
} from '../schema';

/** A destructive step, held until the vendor confirms it. */
export type PendingDiscountAction = { kind: 'delete'; discount: DiscountRow } | null;

/**
 * Everything a vendor can do to a code that is not editing its terms.
 *
 * Separate from `useDiscounts` because an action's in-flight state belongs to
 * one card while the filter, the search and the join belong to the whole page —
 * one hook holding both would re-render every card whenever any of them was
 * touched.
 *
 * Only delete asks for confirmation. Pausing and resuming are one click to
 * undo and the card says which state it is in; a delete is neither, and the
 * code being deleted may be printed on material already in clients' hands.
 */
export function useDiscountActions(vendorId: string) {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingDiscountAction>(null);

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['v-discounts', vendorId] });
    // The Promotions screen counts redemptions through these same rows, so a
    // code paused or removed here must not leave a campaign card claiming a
    // reach it no longer has.
    qc.invalidateQueries({ queryKey: ['v-promotion-discounts', vendorId] });
  }, [qc, vendorId]);

  /** Runs one write against a single card, reporting through that card's spinner. */
  const run = useCallback(
    async (
      id: string,
      write: () => PromiseLike<{ error: { code?: string; message: string } | null }>,
    ) => {
      setBusyId(id);
      setError(null);

      const { error: writeError } = await write();
      setBusyId(null);

      const message = discountWriteMessage(writeError);
      if (message) {
        setError(message);
        return false;
      }
      refresh();
      return true;
    },
    [refresh],
  );

  /**
   * Pause and resume are the same write, because `is_active` is the only thing
   * that separates them — the dates and the cap stay exactly as the vendor set
   * them, so resuming a code mid-window puts it straight back in play rather
   * than restarting its run or refilling its allowance.
   */
  const setActive = useCallback(
    (discount: DiscountRow, active: boolean) =>
      run(discount.id, () =>
        supabase.from('discounts').update({ is_active: active }).eq('id', discount.id),
      ),
    [run],
  );

  /**
   * A copy, on a free code string and deliberately paused.
   *
   * Duplicating is how a vendor reruns last season's offer, and the two things
   * they always change are the window and the code. The copy therefore arrives
   * with a fresh string — codes are unique while they are alive, so it could
   * not reuse the original's — switched off, and with its own redemption tally
   * at zero. Live on the old dates would either publish an offer that already
   * ended or quietly run one they had not finished writing.
   */
  const duplicate = useCallback(
    (discount: DiscountRow, takenCodes: string[]) =>
      run(discount.id, () =>
        supabase.from('discounts').insert({
          ...toDiscountInsert(
            {
              ...toDiscountValues(discount),
              code: toDuplicateCode(discount.code, takenCodes) ?? '',
            },
            vendorId,
          ),
          is_active: false,
        }),
      ),
    [run, vendorId],
  );

  const requestDelete = useCallback((discount: DiscountRow) => {
    setError(null);
    setPending({ kind: 'delete', discount });
  }, []);

  const cancelPending = useCallback(() => setPending(null), []);

  /**
   * Removal is a soft delete, not a `DELETE`.
   *
   * The row carries `deleted_at`/`deleted_by` and every read already filters on
   * it, so stamping it retires the code exactly as a hard delete would while
   * leaving its redemptions — and the bookings they priced — with their history
   * intact. It also frees the code string: the unique index is partial on
   * `deleted_at is null`, so a retired `SUMMER` can be issued again next year.
   */
  const confirmPending = useCallback(async () => {
    if (!pending) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const ok = await run(pending.discount.id, () =>
      supabase
        .from('discounts')
        .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null })
        .eq('id', pending.discount.id),
    );
    if (ok) setPending(null);
  }, [pending, run]);

  return {
    /** The code currently mid-write, so one card can spin without the grid. */
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
