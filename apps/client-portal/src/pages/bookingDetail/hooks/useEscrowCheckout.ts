import { useState } from 'react';
import { useEscrowQuote, useStartEscrowPayment, escrowErrorMessage } from '@/hooks/queries';

export type PaymentRail = {
  provider: 'pesapal' | 'paypal';
  method: 'mtn_momo' | 'airtel_money' | 'card';
};

/**
 * The rails a client can pay on, in the order they are actually used in
 * Uganda. Mobile money leads because it is the default; the card options
 * follow for international clients.
 */
export const PAYMENT_RAILS: Array<PaymentRail & { label: string; caption: string }> = [
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

/**
 * The checkout half of the escrow flow: which rail, what it costs on that
 * rail, and handing off to the provider's hosted page.
 *
 * The quote is re-fetched per rail because the processing fee differs by
 * provider and method and is charged on to the client — switching from mobile
 * money to PayPal genuinely changes the total, and the preview has to say so
 * before the client commits.
 */
export function useEscrowCheckout(bookingId: string | undefined, enabled: boolean) {
  const [railIndex, setRailIndex] = useState(0);
  const rail = PAYMENT_RAILS[railIndex];

  const quote = useEscrowQuote(bookingId, rail.provider, rail.method, enabled);
  const start = useStartEscrowPayment();

  async function pay() {
    if (!bookingId) return;
    const result = await start.mutateAsync({
      bookingId,
      provider: rail.provider,
      method: rail.method,
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
    quoteError: quote.error,
    pay,
    isPaying: start.isPending,
    payError: start.error ? escrowErrorMessage(start.error) : null,
  };
}
