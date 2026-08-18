import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  bookingActionError,
  evaluateBookingStartGate,
  localToday,
  type BookingAction,
} from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import { useBookingEscrow } from '@/hooks/queries';
import type { BookingDetailModel } from '@/lib/types';

/**
 * The RPC behind each action a client may take. One entry today; the shape is
 * what keeps a second from being wired up as another branch in `confirm`.
 */
const CALLS: Partial<
  Record<BookingAction, (bookingId: string, reason: string) => [string, object]>
> = {
  start: (id, reason) => ['start_booking', { p_booking_id: id, p_reason: reason || null }],
};

/**
 * The status writes a client can make against their own booking, and whether
 * each one is available right now.
 *
 * Only one exists today — starting the booking — but it is modelled as an
 * action rather than a bare `start()` because the confirm-then-act sequence,
 * the in-flight state, the translated refusal and the cache invalidation are
 * the same work for every status write. A second one is a new entry in
 * `CALLS`, not a second hook with the same four pieces of state.
 *
 * Confirmation is not optional here. Moving a booking to In Progress is
 * visible to the vendor immediately and cannot be undone from either portal,
 * so the dialog exists to state that before it happens, not to add a step.
 */
export function useBookingActions(booking: BookingDetailModel | null | undefined) {
  const qc = useQueryClient();
  const bookingId = booking?.id;

  // Same query key as the escrow card's own read, so this is a cache hit
  // rather than a second request for the row already on the page.
  const { data: escrow } = useBookingEscrow(bookingId);

  const [pending, setPending] = useState<BookingAction | null>(null);
  const [reason, setReason] = useState('');
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gate = useMemo(
    () =>
      evaluateBookingStartGate({
        status: booking?.status ?? '',
        eventDate: booking?.event_date ?? null,
        escrowStatus: escrow?.status ?? null,
        today: localToday(),
      }),
    [booking?.status, booking?.event_date, escrow?.status],
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
    if (!bookingId) return;
    // Dispatched on the pending action rather than assumed: `start` is the only
    // entry today, and an unmatched one must do nothing rather than quietly
    // fire the wrong RPC when a second is added.
    const call = CALLS[pending as BookingAction];
    if (!call) return;

    setBusy(true);
    setError(null);

    const [fn, args] = call(bookingId, reason.trim());
    const { error: rpcError } = await supabase.rpc(fn, args);
    setBusy(false);

    if (rpcError) {
      setError(bookingActionError(rpcError));
      return;
    }

    setPending(null);
    // The booking row carries the status the whole page reads from, and the
    // trail gains a row on every transition. The list and the dashboard count
    // bookings by status, so both go stale on the same write.
    qc.invalidateQueries({ queryKey: ['booking', bookingId] });
    qc.invalidateQueries({ queryKey: ['booking-history', bookingId] });
    qc.invalidateQueries({ queryKey: ['bookings'] });
    qc.invalidateQueries({ queryKey: ['dashboard-counts'] });
  }, [pending, bookingId, reason, qc]);

  return {
    /** The action awaiting confirmation, or `null` when no dialog is open. */
    pending,
    reason,
    setReason,
    isBusy,
    error,
    request,
    cancel,
    confirm,

    /** Whether the button is live, and the sentence to show when it is not. */
    canStart: gate.canStart,
    startBlockedReason: gate.blockedReason,
    /** Already running — the card says so instead of offering the button. */
    isUnderway: booking?.status === 'in_progress',

    /**
     * Whether the actions card belongs on the page at all. A request still
     * awaiting the vendor has nothing here, and a settled booking has nothing
     * left — in both cases the card would be a heading over an explanation of
     * why it is empty, which is worse than its absence.
     */
    hasActions: ['confirmed', 'in_progress'].includes(booking?.status ?? ''),
  };
}
