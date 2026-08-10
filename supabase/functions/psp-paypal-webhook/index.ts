// psp-paypal-webhook — public endpoint, service_role.
//
// Order of operations matters here: verify the signature, take the idempotency
// gate, then act. The previous version logged first and deduped by counting
// matching log rows afterwards, which raced with itself under PayPal's
// concurrent retries.
//
// The other correction is what counts as paid. CHECKOUT.ORDER.APPROVED means
// the buyer clicked approve — no money has moved. Only a completed *capture*
// funds escrow, and if the order was approved but never captured we capture it
// here rather than assuming.
import { handler, json } from '../_shared/http.ts';
import { adminClient } from '../_shared/supabase.ts';
import { verifyWebhook, captureOrder } from '../_shared/paypal.ts';

/** Terminal outcomes we act on. Everything else is logged and acknowledged. */
const OUTCOME: Record<string, 'succeeded' | 'failed' | 'refunded'> = {
  'PAYMENT.CAPTURE.COMPLETED': 'succeeded',
  'PAYMENT.CAPTURE.DENIED': 'failed',
  'PAYMENT.CAPTURE.DECLINED': 'failed',
  'CHECKOUT.ORDER.VOIDED': 'failed',
  'PAYMENT.CAPTURE.REFUNDED': 'refunded',
  'PAYMENT.CAPTURE.REVERSED': 'refunded',
};

Deno.serve(
  handler(async (req) => {
    const raw = await req.text();
    const supa = adminClient();

    const valid = await verifyWebhook(req.headers, raw);
    const event = JSON.parse(raw || '{}');

    await supa.from('payment_logs').insert({
      provider: 'paypal',
      direction: 'webhook',
      event_type: event.event_type ?? 'unknown',
      payload: event,
      signature_valid: valid,
    });

    // Fail closed. A 400 also stops PayPal retrying something it cannot sign.
    if (!valid) return json(req, { error: 'invalid_signature' }, 400);
    if (!event.id) return json(req, { ok: true, ignored: 'no_event_id' });

    // Idempotency gate, taken before any state change.
    const { error: gateError } = await supa.from('payment_events').insert({
      provider: 'paypal',
      event_id: event.id,
      event_type: event.event_type,
    });
    if (gateError) {
      if (gateError.code === '23505') return json(req, { ok: true, deduped: true });
      // Non-200 so PayPal retries.
      return json(req, { error: 'gate_failed' }, 500);
    }

    try {
      // custom_id is set to our payment id at order creation and, unlike
      // reference_id, survives onto the capture resource.
      const resource = event.resource ?? {};
      const paymentId: string | null =
        resource.custom_id ??
        resource.purchase_units?.[0]?.custom_id ??
        resource.purchase_units?.[0]?.reference_id ??
        null;

      if (!paymentId) {
        await markProcessed(supa, event.id, 'no_payment_reference', null);
        return json(req, { ok: true, ignored: 'no_payment_reference' });
      }

      const { data: payment } = await supa
        .from('payments')
        .select('id, status, amount, provider_ref')
        .eq('id', paymentId)
        .maybeSingle();

      if (!payment) {
        await markProcessed(supa, event.id, 'unknown_payment', null);
        return json(req, { ok: true, ignored: 'unknown_payment' });
      }

      // Approval is not payment. Capture explicitly, and let the resulting
      // PAYMENT.CAPTURE.COMPLETED event (or this capture's own response) be
      // what funds the escrow.
      if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
        const orderId = resource.id ?? payment.provider_ref;
        if (!orderId) {
          await markProcessed(supa, event.id, 'no_order_id', payment.id);
          return json(req, { ok: true, ignored: 'no_order_id' });
        }

        const capture = await captureOrder(orderId);
        await supa.from('payment_logs').insert({
          payment_id: payment.id,
          provider: 'paypal',
          direction: 'response',
          event_type: 'capture',
          payload: capture as unknown as Record<string, unknown>,
        });

        if (capture.status === 'COMPLETED') {
          await applyResult(
            supa,
            payment,
            'succeeded',
            capture.captureId ?? orderId,
            null,
            capture.amount,
          );
          await markProcessed(supa, event.id, 'captured', payment.id);
          return json(req, { ok: true, captured: true });
        }

        await markProcessed(supa, event.id, `capture_${capture.status}`, payment.id);
        return json(req, { ok: true, captureStatus: capture.status });
      }

      const outcome = OUTCOME[event.event_type];
      if (!outcome) {
        await markProcessed(supa, event.id, 'not_actionable', payment.id);
        return json(req, { ok: true, ignored: event.event_type });
      }

      const captured = Number(
        resource.amount?.value ?? resource.seller_receivable_breakdown?.gross_amount?.value ?? 0,
      );
      await applyResult(
        supa,
        payment,
        outcome,
        resource.id ?? event.id,
        resource.status_details?.reason ?? null,
        captured,
      );
      await markProcessed(supa, event.id, outcome, payment.id);
      return json(req, { ok: true, applied: outcome });
    } catch (e) {
      const detail = e instanceof Error ? e.message : 'webhook_error';
      console.error(JSON.stringify({ level: 'error', message: 'paypal_webhook_failed', detail }));
      // Release the gate so PayPal's retry is a real retry, not a dedupe.
      await supa.from('payment_events').delete().eq('provider', 'paypal').eq('event_id', event.id);
      return json(req, { error: detail }, 500);
    }
  }),
);

type PaymentRow = { id: string; status: string; amount: number };

async function applyResult(
  supa: ReturnType<typeof adminClient>,
  payment: PaymentRow,
  status: 'succeeded' | 'failed' | 'refunded',
  providerRef: string,
  reason: string | null,
  confirmedAmount: number,
): Promise<void> {
  // Confirming a different amount than we asked for is never auto-corrected.
  if (
    status === 'succeeded' &&
    confirmedAmount > 0 &&
    Math.abs(confirmedAmount - Number(payment.amount)) > 0.01
  ) {
    await supa.rpc('raise_reconciliation_exception', {
      p_kind: 'psp_amount_mismatch',
      p_dedupe_key: `payment:${payment.id}:amount`,
      p_detail: 'PayPal captured an amount that differs from the payment record',
      p_metadata: { providerRef, confirmed: confirmedAmount },
      p_expected: payment.amount,
      p_actual: confirmedAmount,
      p_payment_id: payment.id,
      p_severity: 'critical',
    });
    return;
  }

  const { error } = await supa.rpc('record_payment_result', {
    p_payment_id: payment.id,
    p_status: status,
    p_provider_ref: providerRef,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
}

async function markProcessed(
  supa: ReturnType<typeof adminClient>,
  eventId: string,
  outcome: string,
  paymentId: string | null,
): Promise<void> {
  await supa
    .from('payment_events')
    .update({ processed_at: new Date().toISOString(), outcome, payment_id: paymentId })
    .eq('provider', 'paypal')
    .eq('event_id', eventId);
}
