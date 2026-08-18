import { useEffect, useRef, useState } from 'react';
import { isPaymentRail, paymentTermsError, type PaymentRail } from '@sinnapi/ui';
import { usePaymentTermsPreview } from '@/hooks/queries';
import { useAdvanceRate } from './useAdvanceRate';

type Options = {
  /** What the booking is worth. Both rails are priced against it. */
  amount: number | null | undefined;
  currency: string | null | undefined;
  /** The advance the vendor proposed on the quote, if this came from one. */
  proposedAdvanceRate?: number | null;
  /**
   * Terms set on the event this booking belongs to. Where present the client
   * has no choice to make here — they made it on the event — so the picker is
   * shown inert rather than hidden. A client who cannot see what they are
   * committed to cannot notice it is wrong.
   */
  eventRail?: string | null;
  /** Only price and validate once the form is actually open. */
  enabled?: boolean;
};

/**
 * The whole payment-terms decision, in one place: which rail, what it costs,
 * how much may be released early, and whether the client has agreed to it.
 *
 * Four surfaces ask this same question — scheduling an accepted quote, making a
 * booking from scratch, booking a vendor against an event, and answering a
 * vendor's counter-proposal — and they must ask it identically. The rail that
 * defaults, the ceiling the advance is checked against, and the rule about when
 * a client may proceed are business rules, not layout, so they live here and
 * every one of those screens takes the same object.
 *
 * WHY CONSENT IS PART OF THIS AND NOT THE CHECKOUT
 * The advance decides how much of the client's money reaches the vendor before
 * the event happens. It used to be agreed at checkout, which is after the
 * vendor had already accepted — so the vendor was committing to a booking whose
 * payout schedule was not yet settled. Asking here means the vendor answers one
 * complete proposal. The rate stays adjustable up to the moment of funding;
 * what is fixed at creation is that the client has seen it.
 */
export function usePaymentTermsChoice({
  amount,
  currency,
  proposedAdvanceRate = null,
  eventRail = null,
  enabled = true,
}: Options) {
  const lockedRail = isPaymentRail(eventRail) ? eventRail : null;

  // Escrow is the default, and deliberately not "whatever they picked last".
  // A default that drifts towards the unprotected rail because the client once
  // chose it for a different vendor is a default making a decision for them.
  const [rail, setRail] = useState<PaymentRail>(lockedRail ?? 'escrow');

  // The event's terms can be set while this form is open — on the event page in
  // another tab, or by an earlier step of the same flow. They win whenever they
  // exist, so the local choice follows rather than silently disagreeing.
  useEffect(() => {
    if (lockedRail) setRail(lockedRail);
  }, [lockedRail]);

  const isEscrow = rail === 'escrow';

  // Priced at the vendor's proposal first, then at whatever the client settles
  // on. The circularity — the quote supplies the ceiling the field is checked
  // against, and the field re-prices the quote — is broken by asking for the
  // proposed rate on the first pass, exactly as the escrow checkout does.
  const [pricedRate, setPricedRate] = useState<number | null>(null);

  // Nothing can be priced against nothing. The query itself is disabled below
  // zero, so this is also the condition under which no request is ever made —
  // which is worth naming, because a disabled query and a failed one both look
  // like "no data" and neither of them is "still loading".
  const canPrice = Number(amount ?? 0) > 0;

  const {
    data: preview = null,
    isLoading,
    isFetching,
    error: previewError,
  } = usePaymentTermsPreview(amount, currency, pricedRate, proposedAdvanceRate, enabled);

  /**
   * The rate the first priced preview came back with — the vendor's proposal,
   * or the platform's suggested figure where there was none.
   *
   * Held in a ref rather than read live, because `preview.advance_rate` is the
   * rate the *current* price was calculated at: once the client moves the
   * slider, every later preview echoes their own choice back. A "suggested"
   * marker fed from the live value would chase the handle and never mark
   * anything. Same reasoning, and the same shape, as the `proposed` ref in
   * `useEscrowActivation`.
   *
   * Written during render, which is safe because it is idempotent: it only ever
   * takes the first non-null preview's rate.
   */
  const startedAt = useRef<number | null>(null);
  if (startedAt.current == null && preview) startedAt.current = preview.advance_rate;

  const advance = useAdvanceRate({
    startingRate: preview?.advance_rate ?? null,
    limit: preview?.advance_rate_limit ?? null,
  });

  useEffect(() => {
    setPricedRate(advance.pricedRate);
  }, [advance.pricedRate]);

  const [agreed, setAgreed] = useState(false);

  // Consent belongs to the escrow rail alone. Ticking a box about a payout
  // schedule on an off-platform booking would be consent to an arrangement
  // Sinnapi is not party to, so the checkbox is not shown and not required.
  const needsConsent = isEscrow;

  // Escrow cannot be agreed against figures we do not have: the split, the fee
  // and the ceiling all come off the preview. Stated as its own condition
  // rather than falling out of `!advance.isSettled` — which is what happened
  // before, and left the submit button dead with nothing on screen to explain
  // it, because the ceiling that would settle the rate was never going to
  // arrive either.
  const isUnpriced = isEscrow && !preview;

  const isRateBlocking = isEscrow && !!preview && (!!advance.error || !advance.isSettled);
  const isBlocked = isUnpriced || (needsConsent && !agreed) || isRateBlocking;

  return {
    rail,
    setRail,
    isEscrow,
    /** Why the picker is inert, or null when the client may choose. */
    lockedReason: lockedRail
      ? 'These payment terms are set on the event this booking belongs to, and apply to every ' +
        'booking under it. Change them on the event to change them here.'
      : null,

    preview,
    isPricing: isLoading || isFetching,
    /** The first load, where there are no figures to dim yet. */
    isLoadingPreview: isLoading,
    /** Whether an amount worth pricing has been supplied at all. */
    canPrice,
    /**
     * Why there are no figures, when there are none and none are coming.
     * Null while a price exists or one is still on its way, so a caller can
     * pass it straight through to the breakdown.
     *
     * The failed case is deliberately not silent. A preview that 500s left the
     * client looking at a permanent skeleton with no idea anything had gone
     * wrong, which is the worst way for a money screen to fail.
     */
    unavailableReason: preview
      ? null
      : previewError
        ? paymentTermsError(previewError)
        : !canPrice
          ? 'Set the amount first and we will show you exactly what each way of paying comes to.'
          : null,

    advance,
    /**
     * Whether a vendor actually proposed this advance, as opposed to the server
     * falling back to `advance_rate_default`.
     *
     * The two are indistinguishable in the priced result — `preview.advance_rate`
     * is whichever one applied — so the answer has to come from the input. Only
     * a quotation carries a vendor's proposal; a booking made from the bookings
     * page or a vendor's profile has none, and the caption beside the control
     * must not claim otherwise. That claim is exactly what used to appear, and
     * it named the vendor for a figure the admin console had set.
     */
    hasVendorProposal: proposedAdvanceRate != null,
    /** The figure the field started on, for a marker on the scale. */
    suggestedRate: startedAt.current,
    needsConsent,
    agreed,
    setAgreed,
    /** True while the client has not finished agreeing to what they chose. */
    isBlocked,

    /**
     * The two terms arguments every creation RPC takes.
     *
     * The advance is sent only on the escrow rail and only once consented to —
     * a rate on the arguments is what stamps `advance_terms_accepted_at`
     * server-side, so sending one the client has not agreed to would record
     * consent they never gave.
     */
    args: {
      p_payment_type: rail,
      p_advance_rate: isEscrow && agreed ? advance.pricedRate : null,
    },
  };
}

export type PaymentTermsChoice = ReturnType<typeof usePaymentTermsChoice>;
