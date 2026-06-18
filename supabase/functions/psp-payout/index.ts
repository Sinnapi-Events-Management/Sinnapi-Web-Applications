// psp-payout — invoked after a payout is Finance-approved (maker-checker).
// Reads decrypted bank details via the audited secure RPC, initiates the PSP
// transfer, then records completion (ledger + escrow paid_out) idempotently.
import { handler, json } from "../_shared/http.ts";
import { adminClient, requireUser, userClient, HttpError } from "../_shared/supabase.ts";
import { createPayout } from "../_shared/paypal.ts";

Deno.serve(handler(async (req) => {
  await requireUser(req);
  const { payoutId } = await req.json();
  if (!payoutId) throw new HttpError(422, "payout_id_required");

  // Authorization (payout.process) is enforced inside the secure RPC; we use the
  // user client so the caller's permissions govern the bank-detail decryption.
  const supa = userClient(req);
  const admin = adminClient();

  const { data: payout, error: pErr } = await admin.from("payouts")
    .select("id,status,amount,currency,bank_account_id,vendor_id").eq("id", payoutId).single();
  if (pErr) throw new HttpError(404, "payout_not_found");
  if (payout.status !== "approved") throw new HttpError(409, "payout_not_approved");

  // audited decrypt — requires payout.process permission
  const { data: bank, error: bErr } = await supa.rpc("get_vendor_bank_account_secure", {
    p_bank_account_id: payout.bank_account_id,
  });
  if (bErr) throw new HttpError(403, bErr.message);

  // NOTE: card/PayPal payout shown; mobile-money disbursement uses the Pesapal
  // payout API analogously, keyed by the vendor's registered MoMo/Airtel number.
  const result = await createPayout({
    reference: payout.id, amount: Number(payout.amount), currency: payout.currency,
    receiverEmail: (bank?.[0]?.account_name as string) ?? "",
  });

  const { error: cErr } = await admin.rpc("complete_payout", {
    p_payout_id: payout.id, p_provider_ref: result.batchId, p_provider: "paypal",
  });
  if (cErr) throw new Error(cErr.message);

  return json(req, { ok: true, batchId: result.batchId });
}));
