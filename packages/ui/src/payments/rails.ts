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

/** A payment brand whose mark `ProviderLogo` can draw. */
export type ProviderLogoId = 'mtn_momo' | 'airtel_money' | 'visa' | 'mastercard' | 'paypal';

export type CheckoutRail = {
  provider: CheckoutProvider;
  method: CheckoutMethod;
};

export type CheckoutRailOption = CheckoutRail & {
  label: string;
  caption: string;
  /** The marks shown on the rail, in the order the payer should read them. */
  logos: readonly ProviderLogoId[];
  /**
   * A fact about this rail the payer should know before choosing it, shown on
   * the card itself. PayPal's is the currency: it is the one rail where the
   * statement will not read in shillings.
   */
  notice?: string;
};

export const CHECKOUT_RAILS: readonly CheckoutRailOption[] = [
  {
    provider: 'pesapal',
    method: 'mtn_momo',
    label: 'MTN Mobile Money',
    caption: 'Approve the prompt on your phone',
    logos: ['mtn_momo'],
  },
  {
    provider: 'pesapal',
    method: 'airtel_money',
    label: 'Airtel Money',
    caption: 'Approve the prompt on your phone',
    logos: ['airtel_money'],
  },
  {
    provider: 'pesapal',
    method: 'card',
    label: 'Debit or credit card',
    caption: 'Visa or Mastercard',
    logos: ['visa', 'mastercard'],
  },
  {
    provider: 'paypal',
    method: 'card',
    label: 'PayPal',
    caption: 'PayPal balance or a card saved to PayPal',
    logos: ['paypal'],
    notice: 'Charged in USD',
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

/** Who runs the hosted page a rail hands the payer to. */
export function checkoutProcessorLabel(rail: CheckoutRail): string {
  return rail.provider === 'paypal' ? 'PayPal' : 'Pesapal';
}

/**
 * The primary button's words for the chosen rail.
 *
 * Baymard's checkout research found generic button copy is where payers
 * hesitate when the button is about to send them to a third party, so the
 * label says where they are going. PayPal also gets a confirmation step
 * first (the currency conversion), so its button promises the next step
 * rather than a payment. Every other rail leaves for the hosted page with the
 * figure on screen, so it names the amount.
 */
export function checkoutActionLabel(rail: CheckoutRail, formattedAmount: string | null): string {
  if (rail.provider === 'paypal') return 'Continue to PayPal';
  return formattedAmount ? `Pay ${formattedAmount}` : 'Pay';
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
