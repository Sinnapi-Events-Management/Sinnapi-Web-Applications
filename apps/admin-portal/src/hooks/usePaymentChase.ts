import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { paymentWindowError, type PaymentChaseAction } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';

/** The RPC behind each action, and the arguments it wants. */
const CALLS: Record<
  PaymentChaseAction,
  (id: string, reason: string, hours: number) => [string, object]
> = {
  nudge: (id, reason) => ['nudge_booking_payment', { p_booking_id: id, p_note: reason || null }],
  extend: (id, reason, hours) => [
    'extend_booking_payment_window',
    { p_booking_id: id, p_hours: hours, p_reason: reason },
  ],
  cancel: (id, reason) => ['cancel_unpaid_booking', { p_booking_id: id, p_reason: reason }],
};

/**
 * The console's writes against an unpaid booking, behind one
 * confirm-then-act sequence.
 *
 * Lives in `src/hooks` rather than under a page because two pages need it and
 * they need it identically: the unpaid queue chases in bulk from a table, and
 * the booking detail chases the one booking an operator has opened. A copy in
 * each is two places for the invalidation set to drift, which shows up as a
 * table that still lists a booking somebody just cancelled.
 *
 * The booking is passed per action rather than held, so the queue can drive it
 * from whichever row an operator clicked without remounting.
 */
export function usePaymentChase() {
  const qc = useQueryClient();

  const [pending, setPending] = useState<PaymentChaseAction | null>(null);
  const [target, setTarget] = useState<{ id: string; reference: string | null } | null>(null);
  const [reason, setReason] = useState('');
  const [hours, setHours] = useState(24);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(
    (action: PaymentChaseAction, booking: { id: string; reference_no: string | null }) => {
      setPending(action);
      setTarget({ id: booking.id, reference: booking.reference_no });
      setReason('');
      setHours(24);
      setError(null);
    },
    [],
  );

  const close = useCallback(() => {
    if (isBusy) return;
    setPending(null);
    setTarget(null);
    setReason('');
    setError(null);
  }, [isBusy]);

  const confirm = useCallback(async () => {
    if (!pending || !target) return;
    setBusy(true);
    setError(null);

    const [fn, args] = CALLS[pending](target.id, reason.trim(), hours);
    const { error: rpcError } = await supabase.rpc(fn, args);

    setBusy(false);
    if (rpcError) {
      setError(paymentWindowError(rpcError));
      return;
    }

    // Every action here changes what the queue should contain — a cancellation
    // removes a row, an extension moves its deadline and clears its overdue
    // flag, a nudge moves its cooldown — so all three invalidate the whole set
    // rather than each guessing which half it touched. The counts share the
    // `admin-unpaid-bookings` prefix, so the badges refresh with the list.
    qc.invalidateQueries({ queryKey: ['admin-unpaid-bookings'] });
    qc.invalidateQueries({ queryKey: ['admin-booking', target.id] });
    qc.invalidateQueries({ queryKey: ['booking-payment-events', target.id] });
    qc.invalidateQueries({ queryKey: ['admin-bookings'] });

    setPending(null);
    setTarget(null);
    setReason('');
  }, [pending, target, reason, hours, qc]);

  return {
    pending,
    /** The booking the open dialog is about, for its heading. */
    target,
    reason,
    setReason,
    hours,
    setHours,
    isBusy,
    error,
    open,
    close,
    confirm,
  };
}
