import { useState } from 'react';
import {
  CHECKOUT_RAILS,
  newCheckoutAttemptKey,
  type CheckoutRail,
  type CheckoutRailOption,
} from '@sinnapi/ui/payments';
import { useEscrowQuote, useStartEscrowPayment, escrowErrorMessage } from '@/hooks/queries';

/** Kept under the names this page has always used; the kit owns the values. */
export type PaymentRail = CheckoutRail;
export const PAYMENT_RAILS: readonly CheckoutRailOption[] = CHECKOUT_RAILS;

/**
 * The checkout half of the escrow flow: which rail, what it costs on that
 * rail, and handing off to the provider's hosted page.
 *
 * The quote is re-fetched per rail because the processing fee differs by
 * provider and method and is charged on to the client — switching from mobile
 * money to PayPal genuinely changes the total, and the preview has to say so
 * before the client commits.
 */
export function useEscrowCheckout(
  bookingId: string | undefined,
  enabled: boolean,
  /** The client's chosen advance, or null to price at the booking's terms. */
  advanceRate: number | null = null,
) {
  const [railIndex, setRailIndex] = useState(0);
  const rail = PAYMENT_RAILS[railIndex];

  /**
   * One idempotency key per checkout attempt.
   *
   * The key names *what the client is agreeing to pay*: this booking, on
   * this rail, with this advance. Anything else about the request repeating
   * — a double-tap, a retry after a dropped connection, a tab restored from
   * history — is the same attempt and must carry the same key, which is what
   * lets the server hand back the checkout it already opened instead of a
   * second charge. Change the rail or the advance and the figure changes, so
   * the key changes with it.
   *
   * It is not regenerated after a failed attempt on purpose: the server
   * releases a key the moment its payment fails, so the same key opens a
   * fresh payment. The one thing a new key must never do is appear for an
   * unchanged attempt, which is why this is state keyed on the scope rather
   * than a memo React is free to drop.
   */
  const attemptScope = `${bookingId ?? ''}|${rail.provider}|${rail.method}|${advanceRate ?? 'terms'}`;
  const [attempt, setAttempt] = useState(() => ({
    scope: attemptScope,
    key: newCheckoutAttemptKey(),
  }));
  let current = attempt;
  if (attempt.scope !== attemptScope) {
    // Derived-state reset during render; React re-runs this render with the
    // stored value before committing, so no stale key is ever observable.
    current = { scope: attemptScope, key: newCheckoutAttemptKey() };
    setAttempt(current);
  }
  const idempotencyKey = current.key;

  const quote = useEscrowQuote(bookingId, rail.provider, rail.method, enabled, advanceRate);
  const start = useStartEscrowPayment();

  async function pay() {
    if (!bookingId) return;
    const result = await start.mutateAsync({
      bookingId,
      provider: rail.provider,
      method: rail.method,
      idempotencyKey,
    });
    // Hand off to the provider's own page. Card and wallet credentials are
    // entered there, never here — that is what keeps Sinnapi in PCI SAQ A
    // scope. A full navigation (not a popup) so mobile browsers behave.
    if (result?.checkoutUrl) window.location.assign(result.checkoutUrl);
  }

  return {
    rails: PAYMENT_RAILS,
    railIndex,
    setRailIndex,
    rail,
    quote: quote.data ?? null,
    isQuoting: quote.isLoading,
    /**
     * A re-price of figures already on screen — a rail switch or a new
     * advance. Distinct from `isQuoting`, which is the first load and the
     * only one that deserves skeletons.
     */
    isRepricing: quote.isFetching && !quote.isLoading,
    quoteError: quote.error,
    pay,
    isPaying: start.isPending,
    payError: start.error ? escrowErrorMessage(start.error) : null,
  };
}
