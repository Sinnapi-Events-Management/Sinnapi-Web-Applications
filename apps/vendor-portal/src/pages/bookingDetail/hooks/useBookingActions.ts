import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  availableBookingActions,
  bookingActionError,
  evaluateBookingCompletionGate,
  evaluateBookingStartGate,
  localToday,
  oppositeRail,
  readPaymentTerms,
  type BookingAction,
  type BookingActionSpec,
  type PaymentRail,
} from '@sinnapi/ui';
import { useNow } from '@sinnapi/ui/data';
import { supabase } from '@/lib/supabase';
import { useVendorBookingEscrow } from '@/hooks/queries';
import type { VendorBookingDetailModel } from '@/lib/types';

/**
 * The RPC behind each action, and the argument shape it expects.
 *
 * `counter` is the only one that needs a third input — the rail being offered
 * instead — so the signature carries it and the three that do not simply ignore
 * it. That is cheaper than a second dispatch table for one entry.
 */
const CALLS: Record<
  BookingAction,
  (bookingId: string, reason: string, counter: PaymentRail | null) => [string, object]
> = {
  start: (id, reason) => ['start_booking', { p_booking_id: id, p_reason: reason || null }],
  accept: (id) => [
    'respond_booking',
    { p_booking_id: id, p_action: 'accept', p_reason: null, p_counter: null },
  ],
  counter: (id, reason, counter) => [
    'respond_booking',
    { p_booking_id: id, p_action: 'counter', p_reason: reason || null, p_counter: counter },
  ],
  decline: (id, reason) => [
    'respond_booking',
    { p_booking_id: id, p_action: 'decline', p_reason: reason || null, p_counter: null },
  ],
  complete: (id) => ['complete_booking', { p_booking_id: id }],
};

/**
 * Every status write the vendor can make against a booking, behind one
 * confirm-then-act sequence.
 *
 * This replaces the writes that used to sit inline in `BookingResponseActions`
 * — four `supabase.rpc` calls, their own busy/error state and a hand-rolled
 * invalidation, all inside a component that also drew the buttons. Accept,
 * decline and *mark completed* fired on a single click; completing a booking
 * opens the escrow release window, so that was a money action with no
 * confirmation in front of it.
 *
 * The dialog is now unconditional, and the copy comes from the shared action
 * spec so the client portal describes the same transition the same way.
 */
export function useBookingActions(booking: VendorBookingDetailModel | null | undefined) {
  const qc = useQueryClient();
  const bookingId = booking?.id;
  const status = booking?.status ?? '';

  const { data: escrow } = useVendorBookingEscrow(bookingId);

  const [pending, setPending] = useState<BookingAction | null>(null);
  const [reason, setReason] = useState('');
  /** The rail being offered back, while a counter is being composed. */
  const [counter, setCounter] = useState<PaymentRail | null>(null);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // What the client proposed and how far it has got. Drives whether countering
  // is on the table at all — terms inherited from the client's event bind every
  // booking under it, so one vendor negotiating them alone is not a move the
  // server will accept, and offering the button would be offering a refusal.
  const terms = useMemo(
    () =>
      readPaymentTerms(
        {
          payment_type: booking?.payment_type ?? null,
          payment_terms_status: booking?.payment_terms_status ?? null,
          payment_terms_counter: booking?.payment_terms_counter ?? null,
          payment_terms_note: booking?.payment_terms_note ?? null,
          payment_terms_from_event: booking?.payment_terms_from_event ?? null,
          status: booking?.status ?? null,
        },
        'vendor',
      ),
    [booking],
  );

  const gate = useMemo(
    () =>
      evaluateBookingStartGate({
        status,
        eventDate: booking?.event_date ?? null,
        escrowStatus: escrow?.status ?? null,
        today: localToday(),
      }),
    [status, booking?.event_date, escrow?.status],
  );

  /**
   * Whether the event is actually over.
   *
   * Marking a booking completed is the vendor asserting the service was
   * delivered, and it is what unlocks the request for the money being held —
   * so it waits for the end of the event rather than being available from the
   * moment the booking is confirmed, which is what it used to be. `now` comes
   * from `useNow` so a page left open through the end of an event unlocks the
   * button on its own instead of needing a reload.
   */
  const now = useNow(60_000, status === 'confirmed' || status === 'in_progress');
  const completionGate = useMemo(
    () =>
      evaluateBookingCompletionGate({
        status,
        eventDate: booking?.event_date ?? null,
        endTime: booking?.end_time ?? null,
        now,
      }),
    [status, booking?.event_date, booking?.end_time, now],
  );

  /**
   * The buttons to draw. `start` and `complete` keep their place even when
   * their gates are unmet — the panel disables them and explains why, rather
   * than leaving the vendor to guess where the control went on the morning of
   * the event.
   */
  const actions = useMemo<
    (BookingActionSpec & { disabled: boolean; blockedReason: string | null })[]
  >(
    () =>
      availableBookingActions(status, 'vendor')
        // Countering is dropped rather than disabled. `start` is disabled with a
        // sentence because the vendor is waiting for it to become available;
        // a counter that can never happen on this booking is not a control
        // waiting to unlock, and the terms card already says why.
        .filter((spec) => spec.action !== 'counter' || terms.canCounter)
        .map((spec) => {
          if (spec.action === 'start') {
            return { ...spec, disabled: !gate.canStart, blockedReason: gate.blockedReason };
          }
          if (spec.action === 'complete') {
            return {
              ...spec,
              disabled: !completionGate.canComplete,
              blockedReason: completionGate.blockedReason,
            };
          }
          return { ...spec, disabled: false, blockedReason: null };
        }),
    [status, gate, completionGate, terms.canCounter],
  );

  const request = useCallback(
    (action: BookingAction) => {
      setError(null);
      setReason('');
      // A counter has exactly one sensible target — the rail the client did not
      // ask for — so it is pre-selected rather than left as an empty required
      // field. The picker stays, because agreeing by default is not agreeing.
      setCounter(action === 'counter' && terms.proposed ? oppositeRail(terms.proposed) : null);
      setPending(action);
    },
    [terms.proposed],
  );

  const cancel = useCallback(() => {
    setError(null);
    setPending(null);
  }, []);

  const confirm = useCallback(async () => {
    if (!pending || !bookingId) return;
    setBusy(true);
    setError(null);

    const [fn, args] = CALLS[pending](bookingId, reason.trim(), counter);
    const { error: rpcError } = await supabase.rpc(fn, args);
    setBusy(false);

    if (rpcError) {
      setError(bookingActionError(rpcError));
      return;
    }

    setPending(null);
    qc.invalidateQueries({ queryKey: ['v-booking', bookingId] });
    // The status trail gains a row on every transition.
    qc.invalidateQueries({ queryKey: ['v-booking-history', bookingId] });
    // Completing a booking opens the escrow release window, so the escrow row
    // this page reads its gate from is stale the moment the write lands.
    qc.invalidateQueries({ queryKey: ['v-booking-escrow', bookingId] });
    // Completing is also what unlocks the payout request, so the settlement
    // card has to re-read: it draws its own gate from the booking status.
    qc.invalidateQueries({ queryKey: ['v-settlement', bookingId] });
    qc.invalidateQueries({ queryKey: ['v-bookings'] });
    qc.invalidateQueries({ queryKey: ['v-dashboard'] });
  }, [pending, bookingId, reason, counter, qc]);

  return {
    actions,
    /** Nothing left to do — the card drops its action half entirely. */
    hasActions: actions.length > 0,
    /** The action awaiting confirmation, or `null` when no dialog is open. */
    pending,
    reason,
    setReason,
    /** The rail being counter-proposed, and the picker's setter. */
    counter,
    setCounter,
    /** The client's proposal and where the negotiation has got to. */
    terms,
    isBusy,
    error,
    request,
    cancel,
    confirm,
    /** A counter with no rail chosen is not submittable. */
    isIncomplete: pending === 'counter' && counter === null,
  };
}
