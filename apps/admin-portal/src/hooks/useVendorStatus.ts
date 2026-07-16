import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type VendorStatus = 'active' | 'suspended';

/** The status change awaiting confirmation, and the vendor it applies to. */
export type PendingStatusChange = {
  id: string;
  businessName: string | null;
  status: VendorStatus;
};

/** Minimal shape a vendor row needs to be actionable. */
type VendorLike = { id: string; business_name: string | null };

/**
 * Owns the confirm-then-write flow for a vendor's active/suspended status:
 * which change is pending, the in-flight/error state, and the write itself.
 *
 * Shared by the vendors list and the vendor detail page so both entry points
 * confirm identically and record the same justification. Suspending also hides
 * the listing; reactivating makes it public again.
 */
export function useVendorStatus() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingStatusChange | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /** Ask for confirmation — does not write. */
  const request = useCallback((vendor: VendorLike, status: VendorStatus) => {
    setErr(null);
    setPending({ id: vendor.id, businessName: vendor.business_name, status });
  }, []);

  const cancel = useCallback(() => {
    setPending(null);
  }, []);

  /** Apply the pending change. `reason` is required by the dialog. */
  const confirm = useCallback(
    async (reason: string) => {
      if (!pending) return;
      setBusy(true);
      setErr(null);
      const { error } = await supabase
        .from('vendors')
        .update({
          status: pending.status,
          visibility: pending.status === 'active' ? 'public' : 'hidden',
          status_change_reason: reason,
        })
        .eq('id', pending.id);
      setBusy(false);
      if (error) {
        setErr(error.message);
        return;
      }
      const changedId = pending.id;
      setPending(null);
      qc.invalidateQueries({ queryKey: ['admin-vendors'] });
      qc.invalidateQueries({ queryKey: ['vendor', changedId] });
    },
    [pending, qc],
  );

  return { pending, busy, err, request, cancel, confirm };
}
