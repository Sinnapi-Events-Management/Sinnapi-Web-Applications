// Minimal Pesapal v3 API client (MTN MoMo / Airtel Money).
// Configure: PESAPAL_BASE_URL, PESAPAL_CONSUMER_KEY, PESAPAL_CONSUMER_SECRET,
//            PESAPAL_IPN_ID, PESAPAL_CALLBACK_URL.
const BASE = Deno.env.get("PESAPAL_BASE_URL") ?? "https://pay.pesapal.com/v3";

async function token(): Promise<string> {
  const res = await fetch(`${BASE}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      consumer_key: Deno.env.get("PESAPAL_CONSUMER_KEY"),
      consumer_secret: Deno.env.get("PESAPAL_CONSUMER_SECRET"),
    }),
  });
  const body = await res.json();
  if (!res.ok || !body.token) throw new Error("pesapal_auth_failed");
  return body.token as string;
}

export async function submitOrder(params: {
  reference: string; amount: number; currency: string; description: string;
  email?: string; phone?: string; firstName?: string;
}): Promise<{ redirectUrl: string; orderTrackingId: string }> {
  const t = await token();
  const res = await fetch(`${BASE}/api/Transactions/SubmitOrderRequest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${t}` },
    body: JSON.stringify({
      id: params.reference,
      currency: params.currency,
      amount: params.amount,
      description: params.description,
      callback_url: Deno.env.get("PESAPAL_CALLBACK_URL"),
      notification_id: Deno.env.get("PESAPAL_IPN_ID"),
      billing_address: { email_address: params.email, phone_number: params.phone, first_name: params.firstName },
    }),
  });
  const body = await res.json();
  if (!res.ok || !body.redirect_url) throw new Error("pesapal_order_failed");
  return { redirectUrl: body.redirect_url, orderTrackingId: body.order_tracking_id };
}

// Authoritative status — re-queried during IPN handling (never trust the IPN body).
export async function getTransactionStatus(orderTrackingId: string): Promise<{ statusCode: number; description: string; amount: number }> {
  const t = await token();
  const res = await fetch(`${BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${t}` },
  });
  const b = await res.json();
  return { statusCode: b.status_code, description: b.payment_status_description, amount: b.amount };
}
