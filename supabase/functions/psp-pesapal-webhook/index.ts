// psp-pesapal-webhook (IPN) — public endpoint, service_role.
// Trust nothing in the body: re-query authoritative status, dedupe, then apply.
import { handler, json } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";
import { getTransactionStatus } from "../_shared/pesapal.ts";

Deno.serve(handler(async (req) => {
  const url = new URL(req.url);
  const orderTrackingId = url.searchParams.get("OrderTrackingId") ?? "";
  const merchantRef = url.searchParams.get("OrderMerchantReference") ?? ""; // = payment id
  const supa = adminClient();

  // log raw IPN
  await supa.from("payment_logs").insert({
    provider: "pesapal", direction: "webhook", event_type: "ipn",
    payload: { orderTrackingId, merchantRef }, signature_valid: true,
  });

  // dedupe: already-final payments are a no-op
  const { data: payment } = await supa.from("payments").select("id,status").eq("id", merchantRef).maybeSingle();
  if (!payment) return json(req, { ok: true, ignored: "unknown_payment" });
  if (["succeeded", "failed", "refunded"].includes(payment.status)) return json(req, { ok: true, deduped: true });

  // authoritative re-query
  const status = await getTransactionStatus(orderTrackingId);
  const mapped = status.statusCode === 1 ? "succeeded" : status.statusCode === 2 ? "failed" : "processing";

  const { error } = await supa.rpc("record_payment_result", {
    p_payment_id: merchantRef, p_status: mapped,
    p_provider_ref: orderTrackingId, p_reason: mapped === "failed" ? status.description : null,
  });
  if (error) throw new Error(error.message);

  // Pesapal expects an acknowledgement payload
  return json(req, { orderNotificationType: "IPNCHANGE", orderTrackingId, status: 200 });
}));
