import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { OfferTargetModel } from '@/lib/types';
import { toTargetKeys, toTargetRow, toggleTarget, type TargetKey } from '../schema/offerTargets';

export type OfferOwner = { promotion_id: string } | { discount_id: string };

/**
 * The selection state behind the target picker, and the write that persists it.
 *
 * Held here rather than in react-hook-form because the targets are NOT part of
 * the offer's form values: they live in a different table, they are written
 * after the offer row exists (a new offer has no id to hang them off until the
 * insert returns), and a half-saved offer whose targets failed should leave the
 * offer standing. Folding them into the zod schema would have made all three of
 * those the form's problem.
 *
 * THE WRITE IS A DIFF, NOT A REPLACE
 * Deleting every row and re-inserting the chosen set would be simpler and is
 * wrong twice over: it churns `created_at` on targets nobody touched, and the
 * window between the delete and the insert is a window in which the offer
 * covers everything the vendor sells — which, for a live campaign being edited,
 * is a live mispriced offer on every package they have.
 *
 * `seed` re-seeds when the offer being edited changes, so opening a second
 * campaign from the grid does not inherit the first one's ticks.
 */
export function useOfferTargetPicker(seed: readonly OfferTargetModel[] | undefined) {
  const seedKeys = useMemo(() => toTargetKeys(seed ?? []), [seed]);
  const [selected, setSelected] = useState<Set<TargetKey>>(() => new Set(seedKeys));

  // Keyed on the joined string rather than the array: `toTargetKeys` returns a
  // fresh array every render, and depending on the array itself would reset the
  // vendor's ticks on every keystroke elsewhere in the dialog.
  const seedSignature = seedKeys.join('|');
  useEffect(() => {
    setSelected(new Set(seedKeys.length > 0 ? seedKeys : []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedSignature]);

  const toggle = useCallback((key: TargetKey) => {
    setSelected((current) => toggleTarget(current, key));
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  /**
   * Persist the selection against an offer that now exists.
   *
   * Returns the error message to surface, or null. The caller decides whether a
   * target failure should block — on create it must not: the offer was written
   * and reporting "could not save" would have the vendor create it twice.
   */
  const save = useCallback(
    async (owner: OfferOwner): Promise<string | null> => {
      const ownerColumn = 'promotion_id' in owner ? 'promotion_id' : 'discount_id';
      const ownerId = 'promotion_id' in owner ? owner.promotion_id : owner.discount_id;

      const { data: existing, error: readError } = await supabase
        .from('offer_targets')
        .select('id,promotion_id,discount_id,kind,package_id,tier_id,vendor_service_id')
        .eq(ownerColumn, ownerId);

      if (readError) return 'Could not read what this offer currently covers. Try again.';

      // Key → row id. Built one row at a time rather than by zipping
      // `toTargetKeys` against `existing`: that helper DROPS rows it cannot
      // key (a malformed target, a kind added later), and a dropped row shifts
      // every id after it onto the wrong key — which would delete targets the
      // vendor never touched.
      const current = new Map<TargetKey, string>();
      for (const row of (existing ?? []) as OfferTargetModel[]) {
        const [key] = toTargetKeys([row]);
        if (key) current.set(key, row.id);
      }

      const toAdd = [...selected].filter((key) => !current.has(key));
      const toRemove = [...current.entries()]
        .filter(([key]) => !selected.has(key))
        .map(([, id]) => id);

      if (toRemove.length > 0) {
        const { error } = await supabase.from('offer_targets').delete().in('id', toRemove);
        if (error) return 'Could not remove a package from this offer. Try again.';
      }

      if (toAdd.length > 0) {
        const rows = toAdd
          .map(toTargetRow)
          .filter((row): row is NonNullable<ReturnType<typeof toTargetRow>> => row !== null)
          .map((row) => ({ ...row, [ownerColumn]: ownerId }));

        const { error } = await supabase.from('offer_targets').insert(rows);
        if (error) {
          // The database refuses a target on another vendor's package
          // (`tg_offer_target_same_vendor`). It should be unreachable from this
          // picker, which only lists the vendor's own — but the table is
          // reachable through PostgREST and the message has to make sense if it
          // ever is.
          return error.message.includes('offer_target_vendor_mismatch')
            ? 'One of those packages is not yours.'
            : 'Could not attach this offer to the packages you chose. Try again.';
        }
      }

      return null;
    },
    [selected],
  );

  return {
    selected,
    toggle,
    clear,
    save,
    /** True while the offer would apply to everything the vendor sells. */
    isVendorWide: selected.size === 0,
    count: selected.size,
  };
}
