import { useEffect, useRef, useState } from 'react';
import { useEscrowCheckout } from './useEscrowCheckout';
import { useAdvanceRate } from '@/components/paymentTerms/hooks/useAdvanceRate';
import type { BookingDetailModel } from '@/lib/types';

type Options = {
  booking: BookingDetailModel;
  open: boolean;
  /** True until the client has consented to an advance schedule. */
  needsAdvanceApproval: boolean;
  /** Records consent at the chosen rate; false if the server refused it. */
  onAcceptTerms: (advanceRate: number | null) => Promise<boolean>;
};

/**
 * Everything the escrow checkout decides, in one place: how much goes early,
 * on which rail, what that costs, and whether the client may proceed.
 *
 * The advance and the price are circular by nature — the chosen rate prices
 * the quote, and the quote supplies the bounds the rate is checked against.
 * The cycle is broken here rather than in a component: the first quote is
 * priced at the booking's own terms, which is what tells the field what the
 * vendor proposed and how high it may go; every later quote is priced at what
 * the client settled on.
 */
export function useEscrowActivation({
  booking,
  open,
  needsAdvanceApproval,
  onAcceptTerms,
}: Options) {
  const [pricedRate, setPricedRate] = useState<number | null>(null);
  const checkout = useEscrowCheckout(booking.id, open, pricedRate);
  const { quote } = checkout;

  const advance = useAdvanceRate({
    startingRate: quote?.advance_rate ?? null,
    limit: quote?.advance_rate_limit ?? null,
  });

  /**
   * The rate the first quote was priced at — the vendor's proposal. Kept so a
   * client who accepts it unchanged keeps asking for the same unparameterised
   * price rather than a second, identical one under a different cache key.
   *
   * Written during render, which is safe because it is idempotent: it only
   * ever takes the first non-null quote's rate.
   */
  const proposed = useRef<number | null>(null);
  if (proposed.current == null && quote) proposed.current = quote.advance_rate;

  useEffect(() => {
    const chosen = advance.pricedRate;
    setPricedRate(chosen != null && chosen === proposed.current ? null : chosen);
  }, [advance.pricedRate]);

  const [agreed, setAgreed] = useState(false);

  // Once consent is recorded the schedule is fixed: the booking carries the
  // rate, an escrow may already be priced against it, and a retry after a
  // failed charge must not quietly re-cut the split.
  const canEditAdvance = needsAdvanceApproval;

  const isRateBlocking = canEditAdvance && (!!advance.error || !advance.isSettled);
  const blocked = (needsAdvanceApproval && !agreed) || isRateBlocking;

  async function pay() {
    // Record consent first: the charge itself refuses without it, so doing it
    // in this order means a client can never reach the PSP and bounce back.
    // The same call fixes the rate, so what was previewed is what is charged.
    // If it is refused — a ceiling tightened since the quote, say — stop here
    // rather than hand the client to a PSP that will bounce them back.
    if (needsAdvanceApproval && !(await onAcceptTerms(advance.pricedRate))) return;
    await checkout.pay();
  }

  return {
    ...checkout,
    pay,
    advance,
    canEditAdvance,
    agreed,
    setAgreed,
    blocked,
    currency: quote?.currency ?? booking.currency,
  };
}
