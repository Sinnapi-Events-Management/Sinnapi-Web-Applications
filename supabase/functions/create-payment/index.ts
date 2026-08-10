// create-payment — user-invoked. Opens a hosted PSP checkout for a booking.
//
// Every figure is derived server-side inside activate_escrow from the booking
// the client is paying for. Nothing money-shaped is accepted from the request
// body: the caller chooses only *which booking* and *which rail*.
import { handler, json } from '../_shared/http.ts';
import { userClient, adminClient, requireUser, HttpError } from '../_shared/supabase.ts';
import { submitOrder } from '../_shared/pesapal.ts';
import { createOrder } from '../_shared/paypal.ts';

type Body = {
  bookingId: string;
  provider: 'pesapal' | 'paypal';
  method: 'mtn_momo' | 'airtel_money' | 'card';
};

const PROVIDERS = new Set(['pesapal', 'paypal']);
const METHODS = new Set(['mtn_momo', 'airtel_money', 'card']);

Deno.serve(
  handler(async (req) => {
    await requireUser(req);
    const b = (await req.json().catch(() => ({}))) as Partial<Body>;

    if (!b.bookingId) throw new HttpError(422, 'booking_id_required');
    if (!b.provider || !PROVIDERS.has(b.provider)) throw new HttpError(422, 'invalid_provider');
    if (!b.method || !METHODS.has(b.method)) throw new HttpError(422, 'invalid_method');
    if (b.provider === 'paypal' && b.method !== 'card') {
      throw new HttpError(422, 'paypal_requires_card');
    }

    const supa = userClient(req);

    // Ownership, booking state, advance-terms consent, pricing and the escrow
    // row are all handled inside the RPC under the caller's own identity.
    const { data, error } = await supa
      .rpc('activate_escrow', {
        p_booking_id: b.bookingId,
        p_provider: b.provider,
        p_method: b.method,
      })
      .maybeSingle();

    if (error) throw new HttpError(mapRpcStatus(error.message), error.message);
    if (!data) throw new HttpError(400, 'escrow_activation_failed');

    const {
      payment_id: paymentId,
      escrow_id: escrowId,
      amount,
      currency,
    } = data as {
      payment_id: string;
      escrow_id: string;
      amount: number;
      currency: string;
    };

    // Billing contact is a convenience for the PSP's own form, never a source
    // of truth — it cannot affect what is charged.
    const { data: profile } = await supa
      .from('profiles')
      .select('email, full_name, phone')
      .maybeSingle();
    const [firstName, ...restName] = (profile?.full_name ?? '').trim().split(/\s+/);

    let checkoutUrl: string;
    let providerRef: string;

    try {
      if (b.provider === 'pesapal') {
        const r = await submitOrder({
          reference: paymentId,
          amount: Number(amount),
          currency,
          description: 'Sinnapi escrow payment',
          email: profile?.email ?? undefined,
          phone: profile?.phone ?? undefined,
          firstName: firstName || undefined,
          lastName: restName.join(' ') || undefined,
        });
        checkoutUrl = r.redirectUrl;
        providerRef = r.orderTrackingId;
      } else {
        const r = await createOrder({
          reference: paymentId,
          amount: Number(amount),
          currency,
          description: 'Sinnapi escrow payment',
        });
        checkoutUrl = r.approveUrl;
        providerRef = r.id;
      }
    } catch (e) {
      // The PSP never opened a checkout, so no money can arrive against this
      // payment. Fail it now rather than leaving a pending row for the
      // reconciliation sweep to puzzle over an hour later.
      const message = e instanceof Error ? e.message : 'psp_error';
      const admin = adminClient();
      await admin.rpc('record_payment_result', {
        p_payment_id: paymentId,
        p_status: 'failed',
        p_provider_ref: null,
        p_reason: message,
      });
      throw new HttpError(502, message);
    }

    // Persist the provider reference immediately. Without it reconciliation
    // has no handle to re-query a payment whose webhook never arrives — the
    // previous version returned it to the browser and stored nothing, which
    // silently disabled the entire stuck-payment sweep.
    const admin = adminClient();
    await admin.rpc('attach_payment_provider_ref', {
      p_payment_id: paymentId,
      p_provider_ref: providerRef,
    });

    await admin.from('payment_logs').insert({
      payment_id: paymentId,
      provider: b.provider,
      direction: 'request',
      event_type: 'checkout_created',
      http_status: 200,
      payload: { providerRef, amount, currency },
    });

    return json(req, { paymentId, escrowId, checkoutUrl, amount, currency });
  }),
);

/** Map the RPC's domain errors onto meaningful HTTP statuses for the UI. */
function mapRpcStatus(message: string): number {
  if (message.includes('forbidden')) return 403;
  if (message.includes('not_found')) return 404;
  if (message.includes('escrow_already_active')) return 409;
  if (
    message.includes('booking_not_confirmed') ||
    message.includes('advance_terms_not_accepted') ||
    message.includes('booking_amount_not_set') ||
    message.includes('paypal_requires_card')
  ) {
    return 422;
  }
  return 400;
}
