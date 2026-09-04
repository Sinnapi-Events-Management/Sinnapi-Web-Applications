import { useState } from 'react';
import { CHECKOUT_RAILS, newCheckoutAttemptKey } from '@sinnapi/ui/payments';
import {
  useSubscriptionQuote,
  useStartSubscriptionPayment,
  subscriptionErrorMessage,
} from '@/hooks/queries';

/**
 * The checkout half of a subscription payment: what the plan costs this
 * vendor right now, which rail, and handing off to the provider's hosted page.
 *
 * Unlike the escrow checkout the quote does not depend on the rail — the
 * platform absorbs the processing fee, so a vendor pays the list price on
 * every rail — which is why the rail is not part of the quote key.
 */
export function useSubscriptionCheckout(
  vendorId: string | undefined,
  planId: string | undefined,
  enabled: boolean,
) {
  const [railIndex, setRailIndex] = useState(0);
  const rail = CHECKOUT_RAILS[railIndex];

  /**
   * One idempotency key per checkout attempt.
   *
   * The key names *what the vendor is agreeing to pay*: this plan, for this
   * vendor, on this rail. Anything else about the request repeating — a
   * double-tap, a retry after a dropped connection — is the same attempt and
   * carries the same key, which is what lets the server hand back the
   * checkout it already opened instead of a second charge. Change the plan
   * or the rail and the key changes with it.
   *
   * It is not regenerated after a failed attempt on purpose: the server
   * releases a key the moment its payment fails, so the same key opens a
   * fresh payment.
   */
  const attemptScope = `${vendorId ?? ''}|${planId ?? ''}|${rail.provider}|${rail.method}`;
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

  const quote = useSubscriptionQuote(vendorId, planId, enabled);
  const start = useStartSubscriptionPayment();

  async function pay() {
    if (!vendorId || !planId) return;
    const result = await start.mutateAsync({
      vendorId,
      planId,
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
    rails: CHECKOUT_RAILS,
    railIndex,
    setRailIndex,
    rail,
    quote: quote.data ?? null,
    isQuoting: quote.isLoading,
    quoteError: quote.error ? subscriptionErrorMessage(quote.error) : null,
    pay,
    isPaying: start.isPending,
    payError: start.error ? subscriptionErrorMessage(start.error) : null,
  };
}
