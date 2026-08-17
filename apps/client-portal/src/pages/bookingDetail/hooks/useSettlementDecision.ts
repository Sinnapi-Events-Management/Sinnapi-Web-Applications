import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { canDecideSettlement, settlementError } from '@sinnapi/ui';
import { useRealtimeRefresh } from '@sinnapi/ui/data';
import { supabase } from '@/lib/supabase';
import { useBookingSettlement, useSettlementEvents } from '@/hooks/queries';
import type { BookingDetailModel } from '@/lib/types';

/**
 * The client's side of the post-event settlement: the decision they are being
 * asked for, and the two ways of answering it.
 *
 * Approving in full and approving less are one RPC because they are one
 * decision — how much of what the vendor asked for is actually owed — and
 * splitting them in the client would let the two drift into different
 * consent rules. The server takes the same view.
 *
 * Subscribed for the same reason as the escrow section: the vendor and an
 * admin both act on this record from their own screens, and a client who has
 * just been told "waiting on the vendor" should see that change when it does.
 */
export function useSettlementDecision(booking: BookingDetailModel | null | undefined) {
  const qc = useQueryClient();
  const bookingId = booking?.id;

  const { data: request, isLoading, error } = useBookingSettlement(bookingId);
  const {
    data: events,
    isLoading: isEventsLoading,
    error: eventsError,
  } = useSettlementEvents(request?.id);

  const [isBusy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['booking-settlement', bookingId] });
    qc.invalidateQueries({ queryKey: ['settlement-events', request?.id] });
    qc.invalidateQueries({ queryKey: ['booking-escrow', bookingId] });
    qc.invalidateQueries({ queryKey: ['booking', bookingId] });
  }, [qc, bookingId, request?.id]);

  useRealtimeRefresh({
    client: supabase,
    channel: `booking-settlement:${bookingId ?? 'none'}`,
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

    /** The decision is live and this client is the one being asked. */
    mustDecide: !!request && canDecideSettlement(request),

    /**
     * Approve everything the vendor asked for. `p_consent` is passed
     * explicitly rather than defaulted true: the server refuses without it,
     * and the dialog cannot submit without the box ticked, so the two agree
     * about what consent means.
     */
    approveFull: () =>
      run('decide_settlement', {
        p_request_id: request?.id,
        p_decision: 'full',
        p_amount: null,
        p_reason: null,
        p_consent: true,
      }),

    /**
     * Approve less, with the reason the vendor will read and may contest.
     * Nothing is paid or refunded until the vendor answers it.
     */
    approveReduced: (amount: number, reason: string) =>
      run('decide_settlement', {
        p_request_id: request?.id,
        p_decision: 'reduced',
        p_amount: amount,
        p_reason: reason,
        p_consent: true,
      }),

    nudge: () => run('nudge_settlement', { p_request_id: request?.id, p_note: null }),
  };
}
