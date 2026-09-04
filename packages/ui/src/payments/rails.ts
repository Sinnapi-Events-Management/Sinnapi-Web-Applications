/**
 * The hosted-checkout rails a person can pay on, and the labels they carry.
 *
 * Shared by the client portal (escrow funding) and the vendor portal
 * (subscriptions) so the two never drift: the same four choices, in the
 * order they are actually used in Uganda. Mobile money leads because it is
 * the default; the card options follow for international payers.
 *
 * Distinct from `PaymentRail` in `molecules/paymentTerms`, which is the
 * escrow-vs-direct *terms* choice on a booking. This is how the money moves.
 */
export type CheckoutProvider = 'pesapal' | 'paypal';
export type CheckoutMethod = 'mtn_momo' | 'airtel_money' | 'card';

export type CheckoutRail = {
  provider: CheckoutProvider;
  method: CheckoutMethod;
};

export type CheckoutRailOption = CheckoutRail & { label: string; caption: string };

export const CHECKOUT_RAILS: readonly CheckoutRailOption[] = [
  {
    provider: 'pesapal',
    method: 'mtn_momo',
    label: 'MTN Mobile Money',
    caption: 'Approve on your phone',
  },
  {
    provider: 'pesapal',
    method: 'airtel_money',
    label: 'Airtel Money',
    caption: 'Approve on your phone',
  },
  {
    provider: 'pesapal',
    method: 'card',
    label: 'Card',
    caption: 'Visa or Mastercard',
  },
  {
    provider: 'paypal',
    method: 'card',
    label: 'PayPal',
    caption: 'Card or PayPal balance',
  },
];

/** The rail as the payer knows it, from a payment row's provider fields. */
export function checkoutRailLabel(provider: string | null, method: string | null): string {
  if (provider === 'paypal') return 'PayPal';
  switch (method) {
    case 'mtn_momo':
      return 'MTN Mobile Money';
    case 'airtel_money':
      return 'Airtel Money';
    case 'card':
      return 'your card';
    default:
      return 'the payment provider';
  }
}

/**
 * A fresh idempotency key for one checkout attempt. Random, not derived from
 * anything on screen: two genuinely separate attempts at the same rail (one
 * abandoned, one later) must be distinguishable to the server, and a derived
 * key would not be.
 */
export function newCheckoutAttemptKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Insecure contexts (plain http on a LAN) lack randomUUID. Uniqueness is
  // all the key needs, not secrecy.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
