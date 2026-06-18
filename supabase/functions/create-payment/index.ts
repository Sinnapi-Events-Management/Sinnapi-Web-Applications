// create-payment — user-invoked. Creates a payment intent (RPC, RLS-scoped to
// the caller) then initiates the PSP checkout. Returns a redirect/approve URL.
import { handler, json } from "../_shared/http.ts";
import { userClient, requireUser, HttpError } from "../_shared/supabase.ts";
import { submitOrder } from "../_shared/pesapal.ts";
import { createOrder } from "../_shared/paypal.ts";

type Body = {
  purpose: "booking_direct" | "escrow_funding" | "subscription";
  provider: "pesapal" | "paypal";
  method: "mtn_momo" | "airtel_money" | "card";
  amount: number;
  currency: "UGX" | "USD";
  bookingId?: string;
  subscriptionId?: string;
};

Deno.serve(handler(async (req) => {
  await requireUser(req);
  const b = (await req.json()) as Body;
  if (!b.amount || b.amount <= 0) throw new HttpError(422, "invalid_amount");
  if (b.provider === "paypal" && b.method !== "card") throw new HttpError(422, "paypal_requires_card");

  const supa = userClient(req);
  // RLS + auth enforced; FX snapshot + escrow row created inside the RPC.
  const { data: paymentId, error } = await supa.rpc("create_payment_intent", {
    p_purpose: b.purpose, p_provider: b.provider, p_method: b.method,
    p_amount: b.amount, p_currency: b.currency,
    p_booking_id: b.bookingId ?? null, p_subscription_id: b.subscriptionId ?? null,
  });
  if (error) throw new HttpError(400, error.message);

  const reference = String(paymentId);
  let checkout: { url: string; providerRef: string };
  if (b.provider === "pesapal") {
    const r = await submitOrder({ reference, amount: b.amount, currency: b.currency, description: `Sinnapi ${b.purpose}` });
    checkout = { url: r.redirectUrl, providerRef: r.orderTrackingId };
  } else {
    const r = await createOrder({ reference, amount: b.amount, currency: b.currency });
    checkout = { url: r.approveUrl, providerRef: r.id };
  }

  // store provider ref + mark processing (service-side update via RPC-less patch is fine here:
  // RLS allows the payer to read; the status move to 'processing' is done by webhook).
  return json(req, { paymentId, checkoutUrl: checkout.url, providerRef: checkout.providerRef });
}));
