/**
 * What the payment provider puts on the query string when it sends the
 * browser back to the return URL.
 *
 * **Pesapal** appends its own parameters:
 *
 *   ?OrderTrackingId=<Pesapal's guid>&OrderMerchantReference=<our payment id>&OrderNotificationType=CALLBACKURL
 *
 * **PayPal** appends `token` (the PayPal order id) and `PayerID`. Neither is
 * our payment id, so `create-payment` embeds it as `pid` on the return URL
 * before the checkout is opened:
 *
 *   ?pid=<our payment id>&token=<PayPal order id>&PayerID=<payer id>
 *
 * Neither provider carries the outcome on the URL — Pesapal omits it on
 * purpose, and PayPal's `token` says nothing about whether the capture
 * succeeded — so a forged link cannot assert one. The return pages read our
 * own `payments` row through RLS and decide the state from that.
 *
 * Anything malformed is refused here rather than sent to the API.
 */
export type PaymentReturnParams = {
  paymentId: string;
  trackingId: string | null;
  /** True when the payer backed out of the provider's hosted checkout. */
  cancelled: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Pesapal tracking ids are guids; PayPal order ids are alphanumeric.
// Accept the shape without insisting on case or exact format.
const TRACKING = /^[A-Za-z0-9-]{8,64}$/;

export function readPaymentReturnParams(params: URLSearchParams): PaymentReturnParams | null {
  const cancelled = params.get('cancelled') === '1';

  // --- Pesapal path ---
  // Pesapal puts our payment id in OrderMerchantReference.
  const pesapalId = (params.get('OrderMerchantReference') ?? '').trim();
  if (UUID.test(pesapalId)) {
    const raw = (params.get('OrderTrackingId') ?? '').trim();
    const trackingId = TRACKING.test(raw) ? raw : null;
    return { paymentId: pesapalId.toLowerCase(), trackingId, cancelled };
  }

  // --- PayPal path ---
  // Our backend embeds the payment id as `pid` on the return URL before the
  // checkout is opened. PayPal preserves it and appends `token` (their order
  // id) and `PayerID`.
  const paypalPid = (params.get('pid') ?? '').trim();
  if (UUID.test(paypalPid)) {
    const raw = (params.get('token') ?? '').trim();
    const trackingId = TRACKING.test(raw) ? raw : null;
    return { paymentId: paypalPid.toLowerCase(), trackingId, cancelled };
  }

  return null;
}

/** Statuses a payment row never leaves. */
export const PAYMENT_TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  'succeeded',
  'failed',
  'refunded',
  'partially_refunded',
]);
