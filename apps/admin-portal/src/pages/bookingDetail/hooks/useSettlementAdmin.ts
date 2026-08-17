import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { canForwardSettlement, canReleaseSettlement, settlementError } from '@sinnapi/ui';
import { useRealtimeRefresh } from '@sinnapi/ui/data';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/admin/AdminProvider';
import { useBookingSettlementAdmin, useSettlementEventsAdmin } from '@/hooks/queries';

/**
 * The console's part in a post-event settlement.
 *
 * Two jobs, deliberately behind two different permissions. Putting the
 * vendor's request to the client is support work — it asks a question and
 * moves no money, so `settlement.manage` is enough. Releasing the agreed
 * figure is the money step and stays behind `escrow.release`, where every
 * other release already is.
 *
 * Subscribed rather than polled: both parties act on this record from their own
 * portals, and a console showing a stale state is how one admin releases
 * something another has already released — or worse, releases a figure the
 * vendor contested thirty seconds ago.
 */
export function useSettlementAdmin(bookingId: string | undefined) {
  const qc = useQueryClient();
  const { has } = useAdmin();

  const { data: request, isLoading, error } = useBookingSettlementAdmin(bookingId);
  const {
    data: events,
    isLoading: isEventsLoading,
    error: eventsError,
  } = useSettlementEventsAdmin(request?.id);

  const [isBusy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['admin-settlement', bookingId] });
    qc.invalidateQueries({ queryKey: ['admin-settlement-events', request?.id] });
    qc.invalidateQueries({ queryKey: ['admin-booking', bookingId] });
    qc.invalidateQueries({ queryKey: ['admin-booking-activity', bookingId] });
    // A release raises a payout and, on a reduction, a refund — both land in
    // queues an operator may have open in another tab.
    qc.invalidateQueries({ queryKey: ['admin-payouts'] });
    qc.invalidateQueries({ queryKey: ['admin-refunds'] });
    qc.invalidateQueries({ queryKey: ['admin-escrow'] });
  }, [qc, bookingId, request?.id]);

  useRealtimeRefresh({
    client: supabase,
    channel: `admin-settlement:${bookingId ?? 'none'}`,
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

  const canManage = has('settlement.manage');
  const canRelease = has('escrow.release');

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

    /** Waiting on us to put it to the client, and this operator may do it. */
    canForward: !!request && canForwardSettlement(request) && canManage,
    /** Both parties have consented and this operator may move the money. */
    canRelease: !!request && canReleaseSettlement(request) && canRelease,
    /** Offered even without release rights: chasing is support work. */
    canNudge: canManage || has('escrow.read'),
    /**
     * Why an action is missing when the state says it should be there. Shown
     * rather than swallowed — an operator who cannot see why a button is absent
     * escalates it to an engineer, which is the expensive version of a sentence.
     */
    permissionNote:
      !!request && canReleaseSettlement(request) && !canRelease
        ? 'Both parties have agreed this figure. Releasing it needs the escrow.release permission.'
        : !!request && canForwardSettlement(request) && !canManage
          ? 'This is waiting to be put to the client. That needs the settlement.manage permission.'
          : null,

    forward: (note: string) =>
      run('forward_settlement', { p_request_id: request?.id, p_note: note || null }),

    release: () => run('release_settlement', { p_request_id: request?.id }),

    nudge: () => run('nudge_settlement', { p_request_id: request?.id, p_note: null }),

    withdraw: (reason: string) =>
      run('cancel_settlement', { p_request_id: request?.id, p_reason: reason }),
  };
}
