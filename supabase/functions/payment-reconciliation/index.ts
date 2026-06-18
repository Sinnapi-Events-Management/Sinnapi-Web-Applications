// payment-reconciliation — cron (daily + hourly light). Cross-checks the
// internal ledger/escrow against PSP-confirmed state and flags mismatches to
// an exception queue (admin alerts). Never auto-corrects money. service_role.
import { handler, json } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";
import { getTransactionStatus } from "../_shared/pesapal.ts";

Deno.serve(handler(async (req) => {
  const supa = adminClient();
  const mismatches: Array<{ kind: string; id: string; detail: string }> = [];

  // 1) Stuck payments: still processing after 1h -> re-query PSP authoritative state.
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: stuck } = await supa.from("payments")
    .select("id,provider,provider_ref,status").in("status", ["pending", "processing"]).lt("created_at", cutoff).limit(100);
  for (const p of stuck ?? []) {
    if (p.provider === "pesapal" && p.provider_ref) {
      try {
        const st = await getTransactionStatus(p.provider_ref);
        const mapped = st.statusCode === 1 ? "succeeded" : st.statusCode === 2 ? "failed" : null;
        if (mapped) await supa.rpc("record_payment_result", { p_payment_id: p.id, p_status: mapped, p_provider_ref: p.provider_ref, p_reason: null });
      } catch (_) { mismatches.push({ kind: "stuck_payment", id: p.id, detail: "psp_requery_failed" }); }
    }
  }

  // 2) Escrow funded but no balanced ledger group.
  const { data: funded } = await supa.from("escrow_transactions").select("id,gross_amount").eq("status", "held").limit(500);
  for (const e of funded ?? []) {
    const { data: legs } = await supa.from("ledger_entries").select("direction,amount").eq("escrow_id", e.id);
    const debit = (legs ?? []).filter((l) => l.direction === "debit").reduce((s, l) => s + Number(l.amount), 0);
    const credit = (legs ?? []).filter((l) => l.direction === "credit").reduce((s, l) => s + Number(l.amount), 0);
    if (debit !== credit) mismatches.push({ kind: "unbalanced_escrow", id: e.id, detail: `dr ${debit} != cr ${credit}` });
  }

  // 3) Raise admin alerts for mismatches (in-app to all admins).
  if (mismatches.length) {
    const { data: admins } = await supa.from("user_roles")
      .select("profile_id, roles!inner(is_admin)").eq("roles.is_admin", true);
    for (const a of admins ?? []) {
      await supa.from("notifications").insert({
        recipient_id: (a as { profile_id: string }).profile_id,
        trigger_key: "finance.reconciliation_alert", channel: "in_app",
        title: "Reconciliation mismatch", body: `${mismatches.length} item(s) need review`, data: { mismatches },
      });
    }
  }
  return json(req, { ok: true, mismatches });
}));
