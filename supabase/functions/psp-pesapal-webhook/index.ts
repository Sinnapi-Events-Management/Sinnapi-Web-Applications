// psp-pesapal-webhook (IPN) — public endpoint, service_role.
//
// Pesapal deliberately omits the payment status from the notification so a
// forged IPN cannot assert one. We therefore trust nothing in the request: the
// only things we take from it are the two ids, and the state comes from
// GetTransactionStatus.
//
// Pesapal reads the acknowledgement from the JSON body, not the HTTP status,
// and retries whenever `status` is not 200. So: 500 in the body for anything
// we genuinely failed to apply (we want the retry), 200 for anything already
// handled or not ours (a retry would never help).
import { handler, json } from '../_shared/http.ts';
import { adminClient } from '../_shared/supabase.ts';
import { getTransactionStatus, mapPesapalStatus } from '../_shared/pesapal.ts';

type Ack = {
  orderNotificationType: string;
  orderTrackingId: string;
  orderMerchantReference: string;
  status: number;
};

function ack(
  req: Request,
  orderTrackingId: string,
  merchantRef: string,
  ok: boolean,
  extra: Record<string, unknown> = {},
): Response {
  const body: Ack & Record<string, unknown> = {
    orderNotificationType: 'IPNCHANGE',
    orderTrackingId,
    orderMerchantReference: merchantRef,
    status: ok ? 200 : 500,
    ...extra,
  };
  return json(req, body, 200);
}

Deno.serve(
  handler(async (req) => {
    const url = new URL(req.url);
    // Pesapal sends these as query params on GET and as a JSON body on POST.
    let orderTrackingId = url.searchParams.get('OrderTrackingId') ?? '';
    let merchantRef = url.searchParams.get('OrderMerchantReference') ?? '';
    let notificationType = url.searchParams.get('OrderNotificationType') ?? 'IPNCHANGE';

    if (!orderTrackingId && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      orderTrackingId = body.OrderTrackingId ?? body.orderTrackingId ?? '';
      merchantRef = body.OrderMerchantReference ?? body.orderMerchantReference ?? '';
      notificationType = body.OrderNotificationType ?? notificationType;
    }

    const supa = adminClient();

    // Append-only audit of the raw notification, whatever happens next.
    await supa.from('payment_logs').insert({
      provider: 'pesapal',
      direction: 'webhook',
      event_type: 'ipn',
      payload: { orderTrackingId, merchantRef, notificationType },
      signature_valid: true, // no signature scheme; authenticity comes from the re-query
    });

    if (!orderTrackingId)
      return ack(req, orderTrackingId, merchantRef, true, { ignored: 'no_tracking_id' });

    // Idempotency gate. The unique (provider, event_id) constraint means only
    // one concurrent delivery can win; the losers short-circuit here before
    // touching any money. Taking the gate *before* the state change is the
    // difference between this and a count-the-rows check that races.
    const { error: gateError } = await supa.from('payment_events').insert({
      provider: 'pesapal',
      event_id: orderTrackingId,
      event_type: notificationType,
    });
    if (gateError) {
      // 23505 = unique violation: we have seen this notification already.
      if (gateError.code === '23505') {
        return ack(req, orderTrackingId, merchantRef, true, { deduped: true });
      }
      console.error(
        JSON.stringify({ level: 'error', message: 'ipn_gate_failed', detail: gateError.message }),
      );
      return ack(req, orderTrackingId, merchantRef, false);
    }

    try {
      const { data: payment } = await supa
        .from('payments')
        .select('id, status, amount, currency')
        .eq('id', merchantRef)
        .maybeSingle();

      if (!payment) {
        // Not a payment we know about. Retrying will not change that.
        await supa
          .from('payment_events')
          .update({ processed_at: new Date().toISOString(), outcome: 'unknown_payment' })
          .eq('provider', 'pesapal')
          .eq('event_id', orderTrackingId);
        return ack(req, orderTrackingId, merchantRef, true, { ignored: 'unknown_payment' });
      }

      // Authoritative state, straight from Pesapal.
      const status = await getTransactionStatus(orderTrackingId);
      const mapped = mapPesapalStatus(status.statusCode);

      // Guard against a transaction being confirmed for the wrong amount.
      // Never auto-correct money — flag it and let Finance look.
      if (mapped === 'succeeded' && Math.abs(status.amount - Number(payment.amount)) > 0.01) {
        await supa.rpc('raise_reconciliation_exception', {
          p_kind: 'psp_amount_mismatch',
          p_dedupe_key: `payment:${payment.id}:amount`,
          p_detail: 'Pesapal confirmed an amount that differs from the payment record',
          p_metadata: { orderTrackingId, confirmed: status.amount },
          p_expected: payment.amount,
          p_actual: status.amount,
          p_payment_id: payment.id,
          p_severity: 'critical',
        });
        await supa
          .from('payment_events')
          .update({
            processed_at: new Date().toISOString(),
            outcome: 'amount_mismatch',
            payment_id: payment.id,
          })
          .eq('provider', 'pesapal')
          .eq('event_id', orderTrackingId);
        return ack(req, orderTrackingId, merchantRef, true, { held: 'amount_mismatch' });
      }

      if (mapped) {
        const { error } = await supa.rpc('record_payment_result', {
          p_payment_id: payment.id,
          p_status: mapped,
          p_provider_ref: orderTrackingId,
          p_reason: mapped === 'succeeded' ? null : status.description,
        });
        if (error) throw new Error(error.message);
      }

      await supa
        .from('payment_events')
        .update({
          processed_at: new Date().toISOString(),
          outcome: mapped ?? `pending(${status.statusCode})`,
          payment_id: payment.id,
        })
        .eq('provider', 'pesapal')
        .eq('event_id', orderTrackingId);

      return ack(req, orderTrackingId, merchantRef, true, { applied: mapped ?? 'no_change' });
    } catch (e) {
      const detail = e instanceof Error ? e.message : 'ipn_error';
      console.error(JSON.stringify({ level: 'error', message: 'ipn_apply_failed', detail }));

      // Release the idempotency gate so Pesapal's retry can genuinely retry
      // rather than being deduped against a delivery we never applied.
      await supa
        .from('payment_events')
        .delete()
        .eq('provider', 'pesapal')
        .eq('event_id', orderTrackingId);

      return ack(req, orderTrackingId, merchantRef, false, { error: detail });
    }
  }),
);
