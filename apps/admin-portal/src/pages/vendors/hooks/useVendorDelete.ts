import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/** The vendor awaiting delete confirmation. */
export type PendingDelete = {
  id: string;
  businessName: string | null;
};

/** Minimal shape the delete rule needs. */
type VendorLike = { id: string; business_name: string | null; status: string };

/**
 * Deleting is gated on suspension so a live vendor can never vanish from under
 * its in-flight bookings — suspending first forces the operator through the
 * reason-capturing status flow.
 */
export function canDeleteVendor(status: string): boolean {
  return status === 'suspended';
}

export const DELETE_BLOCKED_REASON =
  'Only suspended vendors can be deleted. Suspend this vendor first.';

/**
 * Owns the confirm-then-delete flow. The write looks like a hard delete but is
 * not: a BEFORE DELETE trigger on every table with a `deleted_at` column
 * (20260618000010_triggers.sql) rewrites it into `set deleted_at = now(),
 * deleted_by = auth.uid()` and cancels the physical delete, so the row survives
 * and no foreign key cascades fire.
 *
 * Two consequences worth knowing:
 *  - Never chain `.select()` here to assert rows came back. The cancelled DELETE
 *    has nothing to RETURN, so a *successful* delete yields an empty array.
 *  - The row only leaves the list because `useVendorsAdmin` filters
 *    `deleted_at is null`.
 */
export function useVendorDelete() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /** Ask for confirmation — does not write. Ignored unless the vendor is suspended. */
  const request = useCallback((vendor: VendorLike) => {
    if (!canDeleteVendor(vendor.status)) return;
    setErr(null);
    setPending({ id: vendor.id, businessName: vendor.business_name });
  }, []);

  const cancel = useCallback(() => {
    setPending(null);
  }, []);

  const confirm = useCallback(async () => {
    if (!pending) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from('vendors').delete().eq('id', pending.id);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    const deletedId = pending.id;
    setPending(null);
    qc.invalidateQueries({ queryKey: ['admin-vendors'] });
    qc.invalidateQueries({ queryKey: ['vendor', deletedId] });
  }, [pending, qc]);

  return { pending, busy, err, request, cancel, confirm };
}
