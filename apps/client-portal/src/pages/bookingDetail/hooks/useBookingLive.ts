import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeRefresh } from '@sinnapi/ui/data';
import { supabase } from '@/lib/supabase';
import { useBookingEscrow } from '@/hooks/queries';

/**
 * Keeps an open booking page current while money moves for it.
 *
 * Funding is confirmed by a webhook, the advance is released by a cron, a
 * release is approved by an admin — none of it is a request from this
 * browser, so nothing here would refetch on its own. This subscribes once,
 * at page level, to the rows that change on those events and invalidates
 * the queries that read them. Page level and not the Money tab: the status
 * chip in the hero, the payment deadline and the action bar all read the
 * same rows, and a client watching Overview after paying should see the
 * booking flip to funded without going looking for it.
 *
 * postgres_changes evaluates the same RLS a SELECT would, so this is only
 * ever woken by rows the client is entitled to read. It decides nothing
 * about visibility; every handler is a refetch.
 */
export function useBookingLive(bookingId: string | undefined) {
  const qc = useQueryClient();
  // Shared with the Money tab's own read, so this costs no extra request; it
  // is here for the escrow id, which the events table is keyed on.
  const { data: escrow } = useBookingEscrow(bookingId);
  const escrowId = escrow?.id;

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['booking', bookingId] });
    void qc.invalidateQueries({ queryKey: ['booking-history', bookingId] });
    void qc.invalidateQueries({ queryKey: ['booking-escrow', bookingId] });
    void qc.invalidateQueries({ queryKey: ['escrow-events', escrowId] });
    void qc.invalidateQueries({ queryKey: ['escrow-payouts', escrowId] });
    void qc.invalidateQueries({ queryKey: ['payments'] });
    void qc.invalidateQueries({ queryKey: ['bookings'] });
  }, [qc, bookingId, escrowId]);

  useRealtimeRefresh({
    client: supabase,
    channel: `booking-live:${bookingId ?? 'none'}`,
    enabled: !!bookingId,
    onChange: refresh,
    watch: useMemo(
      () => [
        { table: 'bookings', filter: `id=eq.${bookingId}` },
        { table: 'escrow_transactions', filter: `booking_id=eq.${bookingId}` },
        { table: 'payments', filter: `booking_id=eq.${bookingId}` },
        ...(escrowId ? [{ table: 'escrow_events', filter: `escrow_id=eq.${escrowId}` }] : []),
      ],
      [bookingId, escrowId],
    ),
  });

  return { refresh };
}
