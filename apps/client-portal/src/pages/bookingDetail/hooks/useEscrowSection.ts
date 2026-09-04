import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
   * cron releases the advance, an admin approves a release. The subscription
   * that keeps this current lives one level up, in `useBookingLive`, so it
   * runs whichever tab is open; this is the same set of invalidations, kept
   * here for the writes in this section that want to refetch immediately.
   */
  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['booking-escrow', bookingId] });
    qc.invalidateQueries({ queryKey: ['escrow-events', escrow?.id] });
    qc.invalidateQueries({ queryKey: ['escrow-payouts', escrow?.id] });
    qc.invalidateQueries({ queryKey: ['booking', bookingId] });
    qc.invalidateQueries({ queryKey: ['payments'] });
  }, [qc, bookingId, escrow?.id]);

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

    /**
     * Whether this booking is settled through Sinnapi at all.
     *
     * The rail is now a term both parties agreed at the request, so escrow is
     * not something a client opts into afterwards. Offering the button on an
     * off-platform booking would be offering to overwrite an agreement the
     * vendor made — which is exactly what `activate_escrow` used to do, since
     * it set `payment_type = 'escrow'` as a side effect of the charge.
     */
    isEscrowBooking: booking?.payment_type === 'escrow',
    isOffPlatform: booking?.payment_type === 'direct',

    /**
     * Vendors accept before money moves, and now they accept the rail with it.
     * Both conditions matter: `confirmed` alone was reachable on a booking
     * whose terms the vendor countered and the client never answered.
     */
    canActivate:
      booking?.status === 'confirmed' &&
      booking?.payment_type === 'escrow' &&
      booking?.payment_terms_status === 'accepted' &&
      isUnfunded,
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

    /**
     * The escrow's own status, handed to the deadline block as the second
     * opinion on whether the money is in. `payment_settled_at` and this row are
     * written by different paths, and a page that trusts only one of them shows
     * a countdown to a client whose payment landed thirty seconds ago.
     */
    escrowStatus: status,

    isSettled: status === 'paid_out',
    isFrozen: !!escrow?.timers_frozen_at || status === 'disputed',
  };
}
