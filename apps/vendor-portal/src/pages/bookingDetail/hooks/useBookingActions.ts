import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  availableBookingActions,
  bookingActionError,
  evaluateBookingStartGate,
  localToday,
  type BookingAction,
  type BookingActionSpec,
} from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import { useVendorBookingEscrow } from '@/hooks/queries';
import type { VendorBookingDetailModel } from '@/lib/types';

/** The RPC behind each action, and the argument shape it expects. */
const CALLS: Record<BookingAction, (bookingId: string, reason: string) => [string, object]> = {
  start: (id, reason) => ['start_booking', { p_booking_id: id, p_reason: reason || null }],
  accept: (id) => ['respond_booking', { p_booking_id: id, p_action: 'accept', p_reason: null }],
  decline: (id, reason) => [
    'respond_booking',
    { p_booking_id: id, p_action: 'decline', p_reason: reason || null },
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
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
   * The buttons to draw. `start` keeps its place even when its gates are
   * unmet — the panel disables it and explains why, rather than leaving the
   * vendor to guess where the control went on the morning of the event.
   */
  const actions = useMemo<
    (BookingActionSpec & { disabled: boolean; blockedReason: string | null })[]
  >(
    () =>
      availableBookingActions(status, 'vendor').map((spec) =>
        spec.action === 'start'
          ? { ...spec, disabled: !gate.canStart, blockedReason: gate.blockedReason }
          : { ...spec, disabled: false, blockedReason: null },
      ),
    [status, gate],
  );

  const request = useCallback((action: BookingAction) => {
    setError(null);
    setReason('');
    setPending(action);
  }, []);

  const cancel = useCallback(() => {
    setError(null);
    setPending(null);
  }, []);

  const confirm = useCallback(async () => {
    if (!pending || !bookingId) return;
    setBusy(true);
    setError(null);

    const [fn, args] = CALLS[pending](bookingId, reason.trim());
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
    qc.invalidateQueries({ queryKey: ['v-bookings'] });
    qc.invalidateQueries({ queryKey: ['v-dashboard'] });
  }, [pending, bookingId, reason, qc]);

  return {
    actions,
    /** Nothing left to do — the card drops its action half entirely. */
    hasActions: actions.length > 0,
    /** The action awaiting confirmation, or `null` when no dialog is open. */
    pending,
    reason,
    setReason,
    isBusy,
    error,
    request,
    cancel,
    confirm,
  };
}
