// psp-paypal-webhook — public endpoint, service_role.
// Verify signature with PayPal, dedupe by event id, then apply result.
import { handler, json } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";
import { verifyWebhook } from "../_shared/paypal.ts";

Deno.serve(handler(async (req) => {
  const raw = await req.text();
  const supa = adminClient();

  const valid = await verifyWebhook(req.headers, raw);
  const event = JSON.parse(raw);
  await supa.from("payment_logs").insert({
    provider: "paypal", direction: "webhook", event_type: event.event_type,
    payload: event, signature_valid: valid,
  });
  if (!valid) return json(req, { error: "invalid_signature" }, 400);

  // idempotency: skip already-seen event ids
  const { data: seen } = await supa.from("payment_logs")
    .select("id").eq("event_type", event.event_type)
    .contains("payload", { id: event.id }).limit(2);
  if ((seen?.length ?? 0) > 1) return json(req, { ok: true, deduped: true });

  const referenceId = event?.resource?.purchase_units?.[0]?.reference_id
    ?? event?.resource?.supplementary_data?.related_ids?.order_id ?? null;

  let status: string | null = null;
  if (event.event_type === "CHECKOUT.ORDER.APPROVED" || event.event_type === "PAYMENT.CAPTURE.COMPLETED") status = "succeeded";
  else if (event.event_type === "PAYMENT.CAPTURE.DENIED" || event.event_type === "CHECKOUT.ORDER.VOIDED") status = "failed";

  if (status && referenceId) {
    const { error } = await supa.rpc("record_payment_result", {
      p_payment_id: referenceId, p_status: status, p_provider_ref: event.id, p_reason: null,
    });
    if (error) throw new Error(error.message);
  }
  return json(req, { ok: true });
}));
