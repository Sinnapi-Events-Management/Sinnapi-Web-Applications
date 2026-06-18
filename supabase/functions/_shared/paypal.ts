// Minimal PayPal REST client (card payments + payouts + webhook verification).
// Configure: PAYPAL_BASE_URL, PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_WEBHOOK_ID.
const BASE = Deno.env.get("PAYPAL_BASE_URL") ?? "https://api-m.paypal.com";

export async function accessToken(): Promise<string> {
  const creds = btoa(`${Deno.env.get("PAYPAL_CLIENT_ID")}:${Deno.env.get("PAYPAL_SECRET")}`);
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const b = await res.json();
  if (!res.ok) throw new Error("paypal_auth_failed");
  return b.access_token as string;
}

export async function createOrder(params: { reference: string; amount: number; currency: string }): Promise<{ id: string; approveUrl: string }> {
  const t = await accessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{ reference_id: params.reference, amount: { currency_code: params.currency, value: params.amount.toFixed(2) } }],
      application_context: { return_url: Deno.env.get("PAYPAL_RETURN_URL"), cancel_url: Deno.env.get("PAYPAL_CANCEL_URL") },
    }),
  });
  const b = await res.json();
  if (!res.ok) throw new Error("paypal_order_failed");
  const approve = (b.links ?? []).find((l: { rel: string; href: string }) => l.rel === "approve");
  return { id: b.id, approveUrl: approve?.href };
}

// Verify webhook authenticity with PayPal (never trust the raw body alone).
export async function verifyWebhook(headers: Headers, rawBody: string): Promise<boolean> {
  const t = await accessToken();
  const res = await fetch(`${BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: Deno.env.get("PAYPAL_WEBHOOK_ID"),
      webhook_event: JSON.parse(rawBody),
    }),
  });
  const b = await res.json();
  return b.verification_status === "SUCCESS";
}

export async function createPayout(params: { reference: string; amount: number; currency: string; receiverEmail: string }): Promise<{ batchId: string }> {
  const t = await accessToken();
  const res = await fetch(`${BASE}/v1/payments/payouts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender_batch_header: { sender_batch_id: params.reference, email_subject: "Sinnapi payout" },
      items: [{
        recipient_type: "EMAIL", amount: { value: params.amount.toFixed(2), currency: params.currency },
        receiver: params.receiverEmail, note: `Payout ${params.reference}`,
      }],
    }),
  });
  const b = await res.json();
  if (!res.ok) throw new Error("paypal_payout_failed");
  return { batchId: b.batch_header.payout_batch_id };
}
