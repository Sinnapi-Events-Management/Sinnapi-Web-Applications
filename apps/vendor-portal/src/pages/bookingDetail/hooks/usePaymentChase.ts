import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  availablePaymentChaseActions,
  paymentWindowError,
  readPaymentWindow,
  type PaymentChaseAction,
} from '@sinnapi/ui';
import { useNow } from '@sinnapi/ui/data';
import { supabase } from '@/lib/supabase';
import type { VendorBookingDetailModel } from '@/lib/types';

/** The RPC behind each action the vendor can take, and the arguments it wants. */
const CALLS: Record<PaymentChaseAction, (id: string, reason: string) => [string, object]> = {
  nudge: (id, reason) => ['nudge_booking_payment', { p_booking_id: id, p_note: reason || null }],
  cancel: (id, reason) => ['cancel_unpaid_booking', { p_booking_id: id, p_reason: reason }],
  // Extending is an admin lever and `availablePaymentChaseActions` never offers
  // it to a vendor. Present so the dispatch table is total over the action
  // type: a partial record would make adding a fourth action a silent no-op
  // rather than a compile error.
  extend: (id) => ['extend_booking_payment_window', { p_booking_id: id }],
};

/**
 * The vendor's side of an unpaid booking: whether the client is late, and the
 * two things the vendor may do about it.
 *
 * WHY THE VENDOR HAS A CANCEL AT ALL
 * A confirmed booking takes the date off the vendor's calendar. Until now the
 * only way out of one was to ask an admin, which meant a client who simply
 * never paid could hold a Saturday in December for as long as they liked. This
 * gives the vendor exactly one narrow power — end a booking whose payment
 * deadline has passed — and nothing wider: `cancel_unpaid_booking` refuses on a
 * funded booking, on one still inside its window, and on one whose deadline has
 * passed but which the platform has not yet flagged.
 *
 * That last refusal is the one worth stating. The gap between a deadline
 * passing and the sweep noticing is where a client's payment may still be
 * settling at the provider, so the button does not appear until the platform
 * has confirmed the booking is genuinely unpaid and told everyone so.
 * `availablePaymentChaseActions` mirrors that rule, so the vendor is never
 * offered a button the server is about to refuse.
 *
 * Everything below is state and writes. The card that renders it decides only
 * how it looks.
 */
export function usePaymentChase(booking: VendorBookingDetailModel | null | undefined) {
  const qc = useQueryClient();
  const bookingId = booking?.id;

  const [pending, setPending] = useState<PaymentChaseAction | null>(null);
  const [reason, setReason] = useState('');
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCounting = booking?.payment_type === 'escrow' && booking?.status === 'confirmed';
  const now = useNow(60_000, isCounting);

  const window = useMemo(() => readPaymentWindow(booking ?? {}, { now }), [booking, now]);

  const actions = useMemo(() => availablePaymentChaseActions(window, 'vendor'), [window]);

  const open = useCallback((action: PaymentChaseAction) => {
    setPending(action);
    setReason('');
    setError(null);
  }, []);

  const close = useCallback(() => {
    if (isBusy) return;
    setPending(null);
    setReason('');
    setError(null);
  }, [isBusy]);

  const confirm = useCallback(async () => {
    if (!pending || !bookingId) return;
    setBusy(true);
    setError(null);

    const [fn, args] = CALLS[pending](bookingId, reason.trim());
    const { error: rpcError } = await supabase.rpc(fn, args);

    setBusy(false);
    if (rpcError) {
      setError(paymentWindowError(rpcError));
      return;
    }

    // A cancellation rewrites the booking's status and its trail; a reminder
    // adds to the trail and moves the nudge cooldown. Both are visible on this
    // page, so both invalidate the same set rather than each guessing which
    // half it touched.
    qc.invalidateQueries({ queryKey: ['v-booking', bookingId] });
    qc.invalidateQueries({ queryKey: ['v-booking-status', bookingId] });
    qc.invalidateQueries({ queryKey: ['booking-payment-events', bookingId] });
    qc.invalidateQueries({ queryKey: ['v-bookings'] });

    setPending(null);
    setReason('');
  }, [pending, bookingId, reason, qc]);

  return {
    window,
    /** The chase controls to draw, already filtered to what the server allows. */
    actions,
    pending,
    reason,
    setReason,
    isBusy,
    error,
    open,
    close,
    confirm,
  };
}
