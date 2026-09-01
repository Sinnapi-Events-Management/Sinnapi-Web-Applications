import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isPaymentRail, paymentTermsError, type PaymentRail } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import { usePaymentTermsPreview } from '@/hooks/queries';
import type { MyEventModel } from '@/lib/types';
import { useEventBudgetForm } from './useEventBudgetForm';

/** The most a note about payment terms may run to. Matches the RPC's guard. */
const NOTE_LIMIT = 500;

/**
 * Setting the budget and the payment terms that bind every booking made under
 * one event.
 *
 * WHY AN EVENT CARRIES TERMS AT ALL
 * An event is one occasion with many vendors against it — a venue, a caterer, a
 * photographer — and the client's decision about how they want to pay is a
 * decision about the occasion, not about each supplier in turn. Making it once
 * here is the difference between one choice and five, and it is what stops the
 * same wedding being half protected and half not.
 *
 * WHY THE BUDGET IS EDITED HERE TOO
 * The terms comparison is priced against the event's budget, and until it was
 * editable this dialog could tell a client "add a budget and we will show you
 * the numbers" while offering nowhere in the whole portal to add one. The two
 * belong on one screen because they are one question: what do you expect to
 * spend, and how do you want to pay it.
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
  const budget = useEventBudgetForm(event);

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
    // The figure being typed above, not the one on the saved row: the client is
    // deciding what to spend and how to pay it in the same moment, so the cards
    // have to answer the number in front of them. Null while nothing has been
    // stated, which disables the query and leaves the cards unpriced.
    budget.previewAmount,
    budget.currency,
  );

  const termsUnchanged =
    rail === current && note.trim() === (event.payment_terms_note ?? '').trim();

  async function save() {
    if (note.length > NOTE_LIMIT) {
      setError(`That note is too long — keep it under ${NOTE_LIMIT} characters.`);
      return;
    }
    if (!(await budget.validate())) {
      setError('Check the budget figures above.');
      return;
    }

    setBusy(true);
    setError(null);

    // Budget first, terms second, and each only if it moved.
    //
    // The order is the point: writing the budget is a plain column update that
    // nobody is told about, while the terms RPC re-proposes pending bookings and
    // emails their vendors. Doing the harmless one first means a failure in the
    // loud one leaves the quiet one already saved rather than the other way
    // round — and skipping the RPC when the rail and note are untouched means a
    // client correcting a budget does not notify every vendor that terms they
    // never changed have "changed".
    if (budget.isDirty) {
      const budgetError = await budget.save();
      if (budgetError) {
        setBusy(false);
        setError(budgetError);
        return;
      }
    }

    if (!termsUnchanged) {
      const { error: rpcError } = await supabase.rpc('set_event_payment_terms', {
        p_event_id: event.id,
        p_payment_type: rail,
        p_note: note.trim() || null,
      });
      if (rpcError) {
        setBusy(false);
        setError(paymentTermsError(rpcError));
        return;
      }
      // Re-proposing terms rewrites the pending bookings under this event, so
      // every list showing one of them is now stale. A budget-only save touches
      // no booking, so it does not drag these caches with it.
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['booking'] });
    }

    setBusy(false);
    qc.invalidateQueries({ queryKey: ['my-events'] });
    onDone();
  }

  return {
    rail,
    setRail,
    note,
    setNote,
    noteLimit: NOTE_LIMIT,
    /** The budget form the dialog renders, and the figure it prices against. */
    budget,
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
    /**
     * The action's label. A budget-only edit is not "updating terms" — saying so
     * would describe a vendor-facing change the save is deliberately not making.
     */
    saveLabel: termsUnchanged ? 'Save budget' : current != null ? 'Update terms' : 'Set terms',
    /** True when the client has not actually moved anything. */
    isUnchanged: termsUnchanged && !budget.isDirty,
    busy,
    error,
    save,
  };
}
