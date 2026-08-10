import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeRefresh } from '@sinnapi/ui/data';
import { supabase } from '@/lib/supabase';
import { useBookingEscrow, useEscrowPayouts } from '@/hooks/queries';
import type { BookingDetailModel } from '@/lib/types';

/**
 * Everything the escrow section of a booking needs to decide *what to show*,
 * resolved once so the components below it only decide how it looks.
 *
 * The gating rules live here rather than in the card because they are business
 * rules, not presentation: escrow opens only on a vendor-confirmed booking, is
 * offered only while nothing has been funded, and can be confirmed only once
 * the event is behind us.
 */
export function useEscrowSection(booking: BookingDetailModel | null | undefined) {
  const qc = useQueryClient();
  const bookingId = booking?.id;

  const { data: escrow, isLoading, error } = useBookingEscrow(bookingId);
  const { data: payouts } = useEscrowPayouts(escrow?.id);

  /**
   * Escrow moves without the browser asking: a webhook confirms funding, a
   * cron releases the advance, an admin approves a release. Subscribing keeps
   * an open money screen honest instead of showing yesterday's state until
   * someone reloads.
   */
  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['booking-escrow', bookingId] });
    qc.invalidateQueries({ queryKey: ['escrow-events', escrow?.id] });
    qc.invalidateQueries({ queryKey: ['escrow-payouts', escrow?.id] });
    qc.invalidateQueries({ queryKey: ['booking', bookingId] });
    qc.invalidateQueries({ queryKey: ['payments'] });
  }, [qc, bookingId, escrow?.id]);

  useRealtimeRefresh({
    client: supabase,
    channel: `booking-escrow:${bookingId ?? 'none'}`,
    enabled: !!bookingId,
    onChange: refresh,
    watch: useMemo(
      () => [
        { table: 'escrow_transactions', filter: `booking_id=eq.${bookingId}` },
        { table: 'payments', filter: `booking_id=eq.${bookingId}` },
        ...(escrow?.id ? [{ table: 'escrow_events', filter: `escrow_id=eq.${escrow.id}` }] : []),
      ],
      [bookingId, escrow?.id],
    ),
  });

  const status = escrow?.status ?? null;

  // 'initiated' means a checkout was opened but never completed — the booking
  // is still unfunded, so the offer stands and the client can try again.
  const isUnfunded = !escrow || status === 'initiated' || status === 'failed';

  return {
    escrow: escrow ?? null,
    payouts: payouts ?? [],
    isLoading,
    error,
    refresh,

    /** Vendors accept before money is discussed; escrow is meaningless before that. */
    canActivate: booking?.status === 'confirmed' && isUnfunded,
    /** The consent step gates the charge, so it is offered before the rail picker. */
    needsAdvanceApproval: !booking?.advance_terms_accepted_at,
    /** A previous attempt failed and is worth calling out rather than hiding. */
    hasFailedAttempt:
      status === 'failed' || (status === 'initiated' && (escrow?.attempt_no ?? 1) > 1),

    /** The client's half of the release: only after the event is marked done. */
    canConfirmRelease:
      booking?.status === 'completed' && (status === 'held' || status === 'advance_released'),
    /** Raising an issue freezes the timers, so it stays available while money is held. */
    canRaiseIssue:
      !!escrow &&
      ['held', 'awaiting_advance', 'advance_released', 'release_requested'].includes(status ?? ''),

    isSettled: status === 'paid_out',
    isFrozen: !!escrow?.timers_frozen_at || status === 'disputed',
  };
}
