import { isPaymentRail, type PaymentRail } from '@sinnapi/ui';
import type { VendorBookingDetailModel } from '@/lib/types';
import { useBookingEscrow } from './useBookingEscrow';

/** Escrow states where the held/paid split no longer describes the money. */
const REVERSED = new Set(['refunded', 'partially_refunded']);

export type MoneyFigures = {
  /** What the vendor is owed in full — the agreed amount, never net of a fee. */
  total: number | null;
  /** Already released to the vendor. */
  paidToYou: number;
  /** Funded and sitting with Sinnapi, not yet released. */
  held: number;
  /** Not funded by the client yet. */
  awaitingClient: number;
  currency: string;
};

/**
 * The Money tab's one read of where this booking's money is.
 *
 * It exists so the figures are computed once. The tab used to state the agreed
 * amount in three cards and the advance/balance split in two, each deriving it
 * on its own; the summary at the top now owns those numbers and the cards below
 * explain them rather than repeat them.
 *
 * `split` is null whenever a paid/held/awaiting breakdown would mislead: no
 * rail chosen yet, a direct booking (Sinnapi sees none of that money), the
 * escrow still loading, or a refund that has taken money back out.
 */
export function useMoneySection(booking: VendorBookingDetailModel) {
  const escrowSection = useBookingEscrow(booking);
  const { escrow, isFunded, isSettled, advanceReleased } = escrowSection;

  const rail: PaymentRail | null = isPaymentRail(booking.payment_type)
    ? booking.payment_type
    : null;

  const currency = escrow?.currency ?? booking.currency ?? 'UGX';
  const total = escrow?.gross_amount ?? booking.amount;

  const canSplit =
    rail === 'escrow' &&
    total != null &&
    !escrowSection.isLoading &&
    !escrowSection.error &&
    !(escrow && REVERSED.has(escrow.status));

  let split: MoneyFigures | null = null;
  if (canSplit) {
    const whole = Number(total);
    const paidToYou = isSettled ? whole : advanceReleased ? Number(escrow?.advance_amount ?? 0) : 0;
    split = {
      total: whole,
      paidToYou,
      held: isFunded && !isSettled ? Math.max(whole - paidToYou, 0) : 0,
      awaitingClient: isFunded ? 0 : whole,
      currency,
    };
  }

  return {
    escrowSection,
    rail,
    total,
    currency,
    split,
    /** Waiting on the escrow read before the split can be drawn. */
    isSplitLoading: rail === 'escrow' && escrowSection.isLoading,
  };
}

export type MoneySectionModel = ReturnType<typeof useMoneySection>;
