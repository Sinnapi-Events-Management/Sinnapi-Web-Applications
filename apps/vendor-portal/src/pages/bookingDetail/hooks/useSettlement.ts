import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { canRequestSettlement, canRespondToSettlement, settlementError } from '@sinnapi/ui';
import { useRealtimeRefresh } from '@sinnapi/ui/data';
import { supabase } from '@/lib/supabase';
import {
  useSettlementEvents,
  useVendorBookingEscrow,
  useVendorBookingSettlement,
} from '@/hooks/queries';
import type { VendorBookingDetailModel } from '@/lib/types';

/**
 * The vendor's side of the post-event settlement: asking for the money held
 * for them, answering what the client offers, and chasing whoever is holding
 * things up.
 *
 * All the gating lives here rather than in the card, because none of it is
 * presentation — whether a vendor may ask at all depends on the booking being
 * completed (which itself waits for the event to end), on the escrow being
 * funded and unfrozen, and on there being no live request already. The card
 * decides how that reads; this decides what is true.
 *
 * Subscribed rather than polled. The other two parties act on this record from
 * their own screens — an admin forwards it, a client approves or offers less —
 * and a vendor watching their payout should see that happen rather than
 * discover it on the next reload.
 */
export function useSettlement(booking: VendorBookingDetailModel | null | undefined) {
  const qc = useQueryClient();
  const bookingId = booking?.id;

  const { data: escrow } = useVendorBookingEscrow(bookingId);
  const { data: request, isLoading, error } = useVendorBookingSettlement(bookingId);
  const {
    data: events,
    isLoading: isEventsLoading,
    error: eventsError,
  } = useSettlementEvents(request?.id);

  const [isBusy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['v-settlement', bookingId] });
    qc.invalidateQueries({ queryKey: ['v-settlement-events', request?.id] });
    qc.invalidateQueries({ queryKey: ['v-booking-escrow', bookingId] });
    qc.invalidateQueries({ queryKey: ['v-booking', bookingId] });
  }, [qc, bookingId, request?.id]);

  useRealtimeRefresh({
    client: supabase,
    channel: `v-settlement:${bookingId ?? 'none'}`,
    enabled: !!bookingId,
    onChange: refresh,
    watch: useMemo(
      () => [
        { table: 'settlement_requests', filter: `booking_id=eq.${bookingId}` },
        ...(request?.id
          ? [{ table: 'settlement_events', filter: `request_id=eq.${request.id}` }]
          : []),
      ],
      [bookingId, request?.id],
    ),
  });

  /**
   * One place for every write. Each is a single RPC because each is a single
   * decision the server has to authorise and record; this only sequences them
   * and turns a Postgres refusal into a sentence.
   */
  const run = useCallback(
    async (fn: string, args: Record<string, unknown>) => {
      setBusy(true);
      setActionError(null);
      try {
        const { error: rpcError } = await supabase.rpc(fn, args);
        if (rpcError) throw rpcError;
        refresh();
        return true;
      } catch (e) {
        setActionError(settlementError(e));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const gate = useMemo(
    () =>
      canRequestSettlement({
        bookingStatus: booking?.status ?? '',
        escrowStatus: escrow?.status ?? null,
        isFrozen: !!escrow?.timers_frozen_at,
        // A contested or withdrawn request is history and does not block a
        // second attempt; the server takes the same view.
        hasOpenRequest:
          !!request && !['contested', 'cancelled', 'released'].includes(request.status),
      }),
    [booking?.status, escrow?.status, escrow?.timers_frozen_at, request],
  );

  return {
    request: request ?? null,
    events: events ?? [],
    isLoading,
    error,
    isEventsLoading,
    eventsError,
    isBusy,
    actionError,
    clearError: () => setActionError(null),

    /**
     * What the vendor would be asking for, before they ask. Read off the escrow
     * exactly as `request_settlement` does — the balance, plus the advance if
     * it never went out — so the dialog cannot promise a figure the server
     * would then derive differently.
     */
    claimableAmount:
      Number(escrow?.balance_amount ?? 0) +
      (escrow?.advance_released_at ? 0 : Number(escrow?.advance_amount ?? 0)),
    currency: escrow?.currency ?? booking?.currency ?? 'UGX',

    /** Whether the ask is available, and the sentence to show when it is not. */
    canRequest: gate.allowed,
    requestBlockedReason: gate.blockedReason,
    /** A reduction is on the table and the vendor has to answer it. */
    mustRespond: !!request && canRespondToSettlement(request),

    requestPayout: (note: string) =>
      run('request_settlement', { p_booking_id: bookingId, p_note: note || null }),

    /** Accepting a reduced figure. This is the vendor's consent, on the record. */
    acceptOffer: (note: string) =>
      run('respond_settlement', {
        p_request_id: request?.id,
        p_response: 'accepted',
        p_note: note || null,
      }),

    /** Refusing it. Opens a dispute and freezes the money for both sides. */
    contestOffer: (note: string) =>
      run('respond_settlement', {
        p_request_id: request?.id,
        p_response: 'contested',
        p_note: note,
      }),

    nudge: () => run('nudge_settlement', { p_request_id: request?.id, p_note: null }),

    withdraw: (reason: string) =>
      run('cancel_settlement', { p_request_id: request?.id, p_reason: reason }),
  };
}
