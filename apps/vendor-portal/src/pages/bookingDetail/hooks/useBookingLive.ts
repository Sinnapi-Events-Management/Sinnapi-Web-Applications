import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeRefresh } from '@sinnapi/ui/data';
import { supabase } from '@/lib/supabase';
import { useVendorBookingEscrow } from '@/hooks/queries';

/**
 * Keeps an open booking page current while the client's money moves.
 *
 * The vendor's payment card promises "you will see the money here the moment
 * it lands", and until now that was only true after a reload: funding is
 * confirmed by a webhook, the advance is released by a cron, and neither is
 * a request from this browser. This subscribes once, at page level, to the
 * rows those events write and invalidates the queries that read them — the
 * escrow, the booking (whose status chip and payment deadline both move), and
 * the lists behind it.
 *
 * RLS scopes the stream: `payments_read` and `escrow_read` admit the owner of
 * the booking's vendor, so the vendor is woken by the client's payment rows
 * for their own bookings and nothing else. Every handler is a refetch; nothing
 * here decides what the vendor may see.
 */
export function useBookingLive(bookingId: string | undefined) {
  const qc = useQueryClient();
  const { data: escrow } = useVendorBookingEscrow(bookingId);
  const escrowId = escrow?.id;

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['v-booking', bookingId] });
    void qc.invalidateQueries({ queryKey: ['v-booking-history', bookingId] });
    void qc.invalidateQueries({ queryKey: ['v-booking-escrow', bookingId] });
    void qc.invalidateQueries({ queryKey: ['booking-payment-events', bookingId] });
    void qc.invalidateQueries({ queryKey: ['v-bookings'] });
  }, [qc, bookingId]);

  useRealtimeRefresh({
    client: supabase,
    channel: `v-booking-live:${bookingId ?? 'none'}`,
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
