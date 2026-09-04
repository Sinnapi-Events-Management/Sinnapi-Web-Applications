/**
 * What Pesapal puts on the query string when it sends the browser back to
 * the callback URL:
 *
 *   ?OrderTrackingId=<Pesapal's guid>&OrderMerchantReference=<our payment id>&OrderNotificationType=CALLBACKURL
 *
 * Neither carries the outcome — Pesapal omits it on purpose, so a forged link
 * cannot assert one — and the return pages treat them the same way: the
 * merchant reference says which payment to look at, the tracking id is
 * checked against the reference the server stored, and the status comes from
 * our own row read through RLS. Anything malformed is refused here rather
 * than sent to the API.
 */
export type PaymentReturnParams = {
  paymentId: string;
  trackingId: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Pesapal tracking ids are guids; accept the shape without insisting on case.
const TRACKING = /^[A-Za-z0-9-]{8,64}$/;

export function readPaymentReturnParams(params: URLSearchParams): PaymentReturnParams | null {
  const paymentId = (params.get('OrderMerchantReference') ?? '').trim();
  if (!UUID.test(paymentId)) return null;

  const raw = (params.get('OrderTrackingId') ?? '').trim();
  const trackingId = TRACKING.test(raw) ? raw : null;

  return { paymentId: paymentId.toLowerCase(), trackingId };
}

/** Statuses a payment row never leaves. */
export const PAYMENT_TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  'succeeded',
  'failed',
  'refunded',
  'partially_refunded',
]);
