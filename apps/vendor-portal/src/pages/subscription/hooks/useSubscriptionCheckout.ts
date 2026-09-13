import { useState } from 'react';
import {
  CHECKOUT_RAILS,
  checkoutActionLabel,
  checkoutProcessorLabel,
  newCheckoutAttemptKey,
} from '@sinnapi/ui/payments';
import { formatMoney } from '@/lib/config';
import {
  useSubscriptionQuote,
  useStartSubscriptionPayment,
  useFxQuote,
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
  const fx = useFxQuote();

  /**
   * PayPal cannot accept shillings — its Orders API takes 24 currencies and
   * UGX is not one of them — so a PayPal checkout is charged in USD. The
   * vendor sees, and accepts, what the plan price becomes in that currency
   * before anything is created at the provider.
   */
  const needsConversion = rail.provider === 'paypal';
  const [fxOpen, setFxOpen] = useState(false);

  /**
   * Hand off to the provider's own page. Card and wallet credentials are
   * entered there, never here — that is what keeps Sinnapi in PCI SAQ A
   * scope. A full navigation (not a popup) so mobile browsers behave.
   *
   * The rejection is swallowed on purpose: every refusal is already on screen
   * through `payError`, and letting it escape an onClick handler would turn a
   * handled refusal into an unhandled rejection.
   */
  async function handOff(fxQuoteId: string | null) {
    if (!vendorId || !planId) return;
    try {
      const result = await start.mutateAsync({
        vendorId,
        planId,
        provider: rail.provider,
        method: rail.method,
        idempotencyKey,
        fxQuoteId,
      });
      if (result?.checkoutUrl) window.location.assign(result.checkoutUrl);
    } catch {
      // Surfaced as `payError`.
    }
  }

  /** Ask the server what this costs in the currency the provider can take. */
  function requoteFx() {
    if (!vendorId || !planId) return;
    start.reset();
    fx.reset();
    fx.mutate({ vendorId, planId });
  }

  async function pay() {
    if (!vendorId || !planId) return;
    if (!needsConversion) {
      await handOff(null);
      return;
    }
    setFxOpen(true);
    requoteFx();
  }

  async function confirmFx() {
    const converted = fx.data;
    if (!converted) return;
    await handOff(converted.fxQuoteId);
  }

  function cancelFx() {
    setFxOpen(false);
    start.reset();
    fx.reset();
  }

  const priced = quote.data ?? null;
  const quoteError = quote.error ? subscriptionErrorMessage(quote.error) : null;
  const formattedTotal = priced
    ? formatMoney(priced.amount + priced.psp_fee_amount, priced.currency)
    : null;

  return {
    rails: CHECKOUT_RAILS,
    railIndex,
    setRailIndex,
    rail,
    quote: priced,
    isQuoting: quote.isLoading,
    quoteError,
    formattedTotal,
    canPay: !!priced && !quoteError && !quote.isLoading,
    payLabel: start.isPending
      ? `Opening ${checkoutProcessorLabel(rail)}…`
      : checkoutActionLabel(rail, formattedTotal),
    pay,
    isPaying: start.isPending,
    payError: start.error ? subscriptionErrorMessage(start.error) : null,
    /**
     * The currency-conversion step. Empty-handed on every rail but PayPal,
     * where `pay()` opens it instead of navigating and `confirm` is what
     * actually creates the checkout.
     */
    fx: {
      open: fxOpen,
      quote: fx.data ?? null,
      isLoading: fx.isPending,
      isConfirming: start.isPending,
      error: fx.error
        ? subscriptionErrorMessage(fx.error)
        : start.error
          ? subscriptionErrorMessage(start.error)
          : null,
      confirm: confirmFx,
      cancel: cancelFx,
      requote: requoteFx,
    },
  };
}
