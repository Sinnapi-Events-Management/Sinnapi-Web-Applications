import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { paymentTermsError, readPaymentTerms, type PaymentRail } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import { usePaymentTermsChoice } from '@/components/paymentTerms/hooks/usePaymentTermsChoice';
import type { BookingDetailModel } from '@/lib/types';

/**
 * Answering a vendor who proposed the other payment rail.
 *
 * The client is not choosing here — the vendor already named the rail — so this
 * is a yes or a no about one specific arrangement. What makes it more than a
 * confirm dialog is the direction of the change:
 *
 *   towards escrow   the client has never seen a payout schedule for this
 *                    booking, so accepting means consenting to one. The advance
 *                    control is shown and consent is required, exactly as it
 *                    would have been at creation.
 *   towards direct   there is no schedule left to consent to, and the server
 *                    clears any consent already recorded. Nothing to agree
 *                    beyond the rail itself — but there is a great deal to
 *                    *warn* about, which the card above this owns.
 *
 * `usePaymentTermsChoice` is reused for the escrow case rather than
 * re-implemented, so the split the client agrees to here is priced by the same
 * function that prices it everywhere else.
 */
export function useTermsCounter(booking: BookingDetailModel) {
  const qc = useQueryClient();

  const view = readPaymentTerms(booking, 'client');
  const counter = (view.counter ?? 'escrow') as PaymentRail;
  const isTowardsEscrow = counter === 'escrow';

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Priced at the counter's rail, not the booking's current one: what the
  // client is being asked to accept is what they should be looking at.
  const choice = usePaymentTermsChoice({
    amount: booking.amount,
    currency: booking.currency,
    proposedAdvanceRate: booking.advance_rate,
    enabled: open && isTowardsEscrow,
  });

  async function respond(action: 'accept' | 'decline') {
    setBusy(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc('respond_terms_counter', {
      p_booking_id: booking.id,
      p_action: action,
      // Only meaningful on an accept into escrow. The server refuses an accept
      // into escrow that carries neither this nor an existing consent stamp,
      // which is what stops a client being moved onto a payout schedule they
      // were never shown.
      p_advance_rate: action === 'accept' && isTowardsEscrow ? choice.advance.pricedRate : null,
      p_reason: null,
    });

    setBusy(false);

    if (rpcError) {
      setError(paymentTermsError(rpcError));
      return;
    }

    setOpen(false);
    qc.invalidateQueries({ queryKey: ['booking', booking.id] });
    qc.invalidateQueries({ queryKey: ['booking-history', booking.id] });
    qc.invalidateQueries({ queryKey: ['bookings'] });
  }

  return {
    view,
    counter,
    isTowardsEscrow,
    open,
    setOpen,
    busy,
    error,
    choice,
    /** Accepting into escrow needs the client's consent to the split first. */
    canAccept: !busy && (!isTowardsEscrow || !choice.isBlocked),
    accept: () => respond('accept'),
    decline: () => respond('decline'),
  };
}
