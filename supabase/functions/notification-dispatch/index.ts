// notification-dispatch — outbox consumer (cron every minute + on-demand).
// Drains pending outbox rows, fans out to in-app notifications + email.
// Idempotent: rows are claimed by flipping status to 'processing'.
import { handler, json } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";

// event_type -> recipients + trigger key (confirmed Step 1 §I matrix).
const ROUTES: Record<string, { trigger: string }> = {
  vendor_applications_changed: { trigger: "vendor.application.status" },
  bookings_changed: { trigger: "booking.status" },
  quotations_changed: { trigger: "quote.status" },
  escrow_transactions_changed: { trigger: "escrow.status" },
  payments_changed: { trigger: "payment.status" },
  subscriptions_changed: { trigger: "subscription.status" },
  reviews_changed: { trigger: "review.new" },
  event_interests_changed: { trigger: "event.interest" },
  messages_changed: { trigger: "message.new" },
};

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const key = Deno.env.get("EMAIL_API_KEY");
  if (!key) return; // email provider not configured in this environment
  await fetch(Deno.env.get("EMAIL_API_URL") ?? "https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: Deno.env.get("EMAIL_FROM"), to, subject, html }),
  });
}

Deno.serve(handler(async (req) => {
  const supa = adminClient();
  const { data: batch } = await supa.from("outbox")
    .select("*").eq("status", "pending").lte("available_at", new Date().toISOString())
    .order("created_at", { ascending: true }).limit(50);

  let processed = 0;
  for (const row of batch ?? []) {
    // claim
    const { data: claimed } = await supa.from("outbox")
      .update({ status: "processing", attempts: row.attempts + 1 })
      .eq("id", row.id).eq("status", "pending").select("id").maybeSingle();
    if (!claimed) continue; // someone else claimed it

    try {
      const route = ROUTES[row.event_type];
      if (route) {
        // resolve recipients from the aggregate payload (simplified projection)
        const payload = row.payload ?? {};
        const recipients: string[] = [
          payload.client_id, payload.recipient_id, payload.payer_id,
        ].filter(Boolean);
        for (const rid of recipients) {
          await supa.from("notifications").insert({
            recipient_id: rid, trigger_key: route.trigger, channel: "in_app",
            title: route.trigger, body: null, data: { aggregate: row.aggregate_type, id: row.aggregate_id },
          });
          const { data: prof } = await supa.from("profiles").select("email").eq("id", rid).maybeSingle();
          if (prof?.email) await sendEmail(prof.email, `Sinnapi: ${route.trigger}`, `<p>Update: ${route.trigger}</p>`);
        }
      }
      await supa.from("outbox").update({ status: "processed", processed_at: new Date().toISOString() }).eq("id", row.id);
      processed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "dispatch_error";
      // retry up to 5x then dead-letter
      await supa.from("outbox").update({
        status: row.attempts >= 5 ? "failed" : "pending",
        available_at: new Date(Date.now() + 60_000 * (row.attempts + 1)).toISOString(),
        error: msg,
      }).eq("id", row.id);
    }
  }
  return json(req, { ok: true, processed });
}));
