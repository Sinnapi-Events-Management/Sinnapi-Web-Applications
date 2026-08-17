import { useVendorBookingEscrow } from '@/hooks/queries';
import type { VendorBookingDetailModel } from '@/lib/types';

/**
 * Where the money for this booking is, from the vendor's side.
 *
 * The vendor has no write on escrow at all — funding, disputes and release
 * confirmation belong to the client or an operator — so everything here is a
 * reading rather than an affordance. That is the point: the single most common
 * question a vendor brings to a booking page is "have I been paid, and when
 * will I be", and until now the only way to answer it was to ask.
 *
 * The states are named rather than left as raw status strings so the card can
 * stay layout-only, and so "nothing funded yet" and "nothing will ever be
 * funded" cannot be rendered as the same sentence.
 */
export function useBookingEscrow(booking: VendorBookingDetailModel) {
  const { data: escrow, isLoading, error } = useVendorBookingEscrow(booking.id);

  const isOffPlatform = booking.payment_type === 'direct';
  const isFrozen = !!escrow?.timers_frozen_at;

  return {
    escrow,
    isLoading,
    error,

    /** Agreed to be settled directly, so no escrow exists and none will. */
    isOffPlatform,
    /** The client has funded: Sinnapi is holding money against this booking. */
    isFunded: !!escrow && !['initiated', 'failed'].includes(escrow.status),
    /** The advance has left the held pool and is on its way to the vendor. */
    advanceReleased: !!escrow?.advance_released_at,
    /** A dispute or reversal is under review — nothing releases while it is. */
    isFrozen,
    /** Everything owed has been paid out; the booking is closed for money. */
    isSettled: escrow?.status === 'paid_out',
  };
}
