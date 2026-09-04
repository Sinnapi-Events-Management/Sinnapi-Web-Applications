/**
 * `payments.failure_reason` in a sentence a person can act on.
 *
 * The column holds two kinds of value: tokens our own functions write
 * (`checkout_expired`, a `pesapal_*` error) and the provider's own
 * description of a decline, passed through by the webhook. The tokens get a
 * translation; the descriptions are shown as they are, because "Insufficient
 * funds" from the provider is already the most useful thing we can say.
 */
const KNOWN: Record<string, string> = {
  checkout_expired:
    'The payment page was left open for too long and this attempt lapsed. Nothing was charged.',
  superseded_checkout:
    'A newer payment attempt replaced this one, so it was closed. Nothing was charged on it.',
  psp_reversal:
    'The provider reversed this payment after it was made. Our finance team has been alerted and will be in touch.',
};

export function describePaymentFailure(status: string, reason: string | null): string {
  if (status === 'refunded' || status === 'partially_refunded') {
    return KNOWN.psp_reversal;
  }
  const key = (reason ?? '').trim();
  if (!key) return 'The provider did not confirm this payment. Nothing was charged.';
  if (KNOWN[key]) return KNOWN[key];
  // Our own functions fail a payment when the PSP would not open a checkout
  // for it; the token names the call, which means nothing to a person.
  if (/^(pesapal|paypal)_/.test(key)) {
    return 'The payment provider could not open a checkout for this payment. Nothing was charged.';
  }
  return key;
}
