import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type VendorDecision = 'approve' | 'reject';

/** Minimal shape a row needs to be decidable — both engagement models supply it. */
export type VendorLike = { vendor_id: string; business_name: string | null };

/** The decision awaiting confirmation, and the vendor it applies to. */
export type PendingDecision = {
  vendorId: string;
  businessName: string | null;
  decision: VendorDecision;
};

/**
 * Owns the confirm-then-write flow for approving or rejecting a vendor's
 * engagement with an event. Approve shortlists the interest and accepts the
 * vendor's open quotations; reject declines both — the write is one
 * `admin_decide_event_vendor` RPC (RLS blocks an admin from touching those
 * tables directly). Shared by the Interested and Quotations tabs so both
 * confirm identically and refresh the same caches.
 */
export function useEventVendorDecision(eventId: string) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingDecision | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /** Ask for confirmation — does not write. */
  const request = useCallback((vendor: VendorLike, decision: VendorDecision) => {
    setErr(null);
    setPending({ vendorId: vendor.vendor_id, businessName: vendor.business_name, decision });
  }, []);

  const cancel = useCallback(() => setPending(null), []);

  const confirm = useCallback(async () => {
    if (!pending) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc('admin_decide_event_vendor', {
      p_event_id: eventId,
      p_vendor_id: pending.vendorId,
      p_decision: pending.decision,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setPending(null);
    qc.invalidateQueries({ queryKey: ['event-interests', eventId] });
    qc.invalidateQueries({ queryKey: ['event-quotations', eventId] });
    qc.invalidateQueries({ queryKey: ['event-engagement', eventId] });
  }, [pending, eventId, qc]);

  return { pending, busy, err, request, cancel, confirm };
}
