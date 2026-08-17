import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isPaymentRail, paymentTermsError, type PaymentRail } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import { usePaymentTermsPreview } from '@/hooks/queries';
import type { MyEventModel } from '@/lib/types';

/** The most a note about payment terms may run to. Matches the RPC's guard. */
const NOTE_LIMIT = 500;

/**
 * Setting the payment terms that bind every booking made under one event.
 *
 * WHY AN EVENT CARRIES TERMS AT ALL
 * An event is one occasion with many vendors against it — a venue, a caterer, a
 * photographer — and the client's decision about how they want to pay is a
 * decision about the occasion, not about each supplier in turn. Making it once
 * here is the difference between one choice and five, and it is what stops the
 * same wedding being half protected and half not.
 *
 * WHAT SAVING ACTUALLY DOES
 * `set_event_payment_terms` re-proposes the new rail on every booking under the
 * event that is still waiting on a vendor answer, and notifies those vendors.
 * Bookings the vendor has already confirmed keep the terms both parties agreed —
 * an event setting is not a way to rewrite an agreement after the fact, and the
 * dialog says so rather than leaving the client to discover it.
 *
 * The preview is priced against the event's own budget. An event has no single
 * agreed amount, so this is an illustration and is labelled as one; each booking
 * is priced on what that booking is worth.
 */
export function useEventPaymentTerms(event: MyEventModel, onDone: () => void) {
  const qc = useQueryClient();

  const current = isPaymentRail(event.payment_type) ? event.payment_type : null;

  const [rail, setRail] = useState<PaymentRail>(current ?? 'escrow');
  const [note, setNote] = useState(event.payment_terms_note ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The event can change under an open dialog — another tab, a refetch after a
  // booking landed. Following it is better than editing a stale rail and
  // silently overwriting whatever arrived.
  useEffect(() => {
    setRail(current ?? 'escrow');
    setNote(event.payment_terms_note ?? '');
  }, [current, event.payment_terms_note]);

  const {
    data: preview = null,
    isLoading,
    isFetching,
    error: previewError,
  } = usePaymentTermsPreview(
    // The upper end of the stated budget, falling back to the lower. Null when
    // neither was given, which disables the query and leaves the cards
    // unpriced — an illustration built on a number the client never supplied
    // would be a figure we invented.
    event.budget_max ?? event.budget_min,
    event.currency,
  );

  async function save() {
    if (note.length > NOTE_LIMIT) {
      setError(`That note is too long — keep it under ${NOTE_LIMIT} characters.`);
      return;
    }

    setBusy(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc('set_event_payment_terms', {
      p_event_id: event.id,
      p_payment_type: rail,
      p_note: note.trim() || null,
    });

    setBusy(false);

    if (rpcError) {
      setError(paymentTermsError(rpcError));
      return;
    }

    qc.invalidateQueries({ queryKey: ['my-events'] });
    // Re-proposing terms rewrites the pending bookings under this event, so
    // every list showing one of them is now stale.
    qc.invalidateQueries({ queryKey: ['bookings'] });
    qc.invalidateQueries({ queryKey: ['booking'] });

    onDone();
  }

  return {
    rail,
    setRail,
    note,
    setNote,
    noteLimit: NOTE_LIMIT,
    preview,
    isPricing: isLoading || isFetching,
    /** The first load, where there are no figures to dim yet. */
    isLoadingPreview: isLoading,
    /**
     * Why the illustration is missing, when it is. A failed preview must not
     * read as a loading one: the rail can still be set without it — this is an
     * illustration, not a price anyone is charged — so the dialog stays usable
     * and simply says the figures are unavailable.
     */
    unavailableReason: preview ? null : previewError ? paymentTermsError(previewError) : null,
    /** No budget on the event, so there is nothing to price the cards against. */
    hasBudget: (event.budget_max ?? event.budget_min ?? 0) > 0,
    /** Whether terms were already set — changing them reads differently. */
    isChange: current != null,
    /** True when the client has not actually moved anything. */
    isUnchanged: rail === current && note.trim() === (event.payment_terms_note ?? '').trim(),
    busy,
    error,
    save,
  };
}
