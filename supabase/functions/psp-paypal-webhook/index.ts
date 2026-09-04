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
//
// TWO THINGS CHANGED WITH 0904.
//
// The raw event body is no longer stored verbatim. `payload: event` was the
// obvious thing to write and it was wrong: a PayPal event carries
// `payer.email_address`, `payer.name`, `shipping.address` and, on a card
// capture, `payment_source.card.last_digits` / `brand` / `expiry`. That is
// personal data being copied into an append-only table under a seven-year
// hold, which is a retention decision nobody made. Everything now goes through
// `writePaymentLog`, which redacts and records WHICH fields were removed — so
// a reader can still tell a redacted field from one PayPal never sent.
//
// And every decision is attributed. This handler runs as service_role, so
// `auth.uid()` is null and every audit row its RPCs caused read as 'system',
// indistinguishable from a cron. `actor_kind: 'psp_webhook'` with
// `actor_label: 'paypal_webhook'` says which webhook, on every branch —
// including the ones that refuse to apply anything.
import { handler, json } from '../_shared/http.ts';
import { adminClient } from '../_shared/supabase.ts';
import { verifyWebhook, captureOrder } from '../_shared/paypal.ts';
import {
  paymentContext,
  withCorrelation,
  writeAudit,
  writePaymentLog,
  type PaymentContext,
} from '../_shared/audit.ts';
import { redactMessage } from '../_shared/redact.ts';

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

    // No correlation id yet: `custom_id` has not been resolved to a payment,
    // and correlating an event to a payment we have not confirmed it belongs
    // to would put a forged delivery on someone else's trace.
    let ctx = paymentContext('psp_webhook', 'paypal_webhook', 'psp-paypal-webhook', { req });

    await writePaymentLog(supa, ctx, {
      provider: 'paypal',
      direction: 'webhook',
      eventType: event.event_type ?? 'unknown',
      payload: event,
      signatureValid: valid,
    });

    await writeAudit(supa, ctx, {
      action: 'webhook_received',
      entityType: 'payments',
      detail: { eventId: event.id ?? null, eventType: event.event_type ?? null, valid },
    });

    // Fail closed. A 400 also stops PayPal retrying something it cannot sign.
    if (!valid) {
      // A body that will not verify is either a misconfiguration or somebody
      // asserting a capture we never received. Both are worth a row.
      await writeAudit(supa, ctx, {
        action: 'webhook_rejected',
        entityType: 'payments',
        detail: {
          reason: 'invalid_signature',
          eventId: event.id ?? null,
          eventType: event.event_type ?? null,
        },
      });
      return json(req, { error: 'invalid_signature' }, 400);
    }
    if (!event.id) {
      await writeAudit(supa, ctx, {
        action: 'webhook_ignored',
        entityType: 'payments',
        detail: { reason: 'no_event_id', eventType: event.event_type ?? null },
      });
      return json(req, { ok: true, ignored: 'no_event_id' });
    }

    // Idempotency gate, taken before any state change.
    const { error: gateError } = await supa.from('payment_events').insert({
      provider: 'paypal',
      event_id: event.id,
      event_type: event.event_type,
    });
    if (gateError) {
      if (gateError.code === '23505') {
        await writeAudit(supa, ctx, {
          action: 'webhook_deduped',
          entityType: 'payments',
          detail: { eventId: event.id, eventType: event.event_type },
        });
        return json(req, { ok: true, deduped: true });
      }
      await writeAudit(supa, ctx, {
        action: 'webhook_failed',
        entityType: 'payments',
        detail: {
          reason: 'gate_failed',
          detail: redactMessage(gateError.message),
          eventId: event.id,
        },
      });
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
        await writeAudit(supa, ctx, {
          action: 'webhook_rejected',
          entityType: 'payments',
          detail: {
            reason: 'no_payment_reference',
            eventId: event.id,
            eventType: event.event_type,
          },
        });
        return json(req, { ok: true, ignored: 'no_payment_reference' });
      }

      const { data: payment } = await supa
        .from('payments')
        .select('id, status, amount, provider_ref, correlation_id')
        .eq('id', paymentId)
        .maybeSingle();

      if (!payment) {
        await markProcessed(supa, event.id, 'unknown_payment', null);
        await writeAudit(supa, ctx, {
          action: 'webhook_rejected',
          entityType: 'payments',
          detail: { reason: 'unknown_payment', claimedPaymentId: paymentId, eventId: event.id },
        });
        return json(req, { ok: true, ignored: 'unknown_payment' });
      }

      // The payment is real, so everything from here joins its trace — and the
      // gate row, inserted before we knew which payment it belonged to, is
      // back-filled with it.
      ctx = withCorrelation(ctx, payment.correlation_id as string | null);
      await supa
        .from('payment_events')
        .update({ correlation_id: ctx.correlation_id })
        .eq('provider', 'paypal')
        .eq('event_id', event.id);

      // Approval is not payment. Capture explicitly, and let the resulting
      // PAYMENT.CAPTURE.COMPLETED event (or this capture's own response) be
      // what funds the escrow.
      if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
        const orderId = resource.id ?? payment.provider_ref;
        if (!orderId) {
          await markProcessed(supa, event.id, 'no_order_id', payment.id);
          await writeAudit(supa, ctx, {
            action: 'webhook_rejected',
            entityType: 'payments',
            entityId: payment.id,
            detail: { reason: 'no_order_id', eventId: event.id },
          });
          return json(req, { ok: true, ignored: 'no_order_id' });
        }

        // An approval is not a payment; this is us deciding to take the money.
        // Recorded as its own decision because it is the one place this
        // function initiates a charge rather than reacting to one.
        await writeAudit(supa, ctx, {
          action: 'capture_requested',
          entityType: 'payments',
          entityId: payment.id,
          detail: { orderId, eventId: event.id },
        });

        const capture = await captureOrder(orderId);
        await writePaymentLog(supa, ctx, {
          paymentId: payment.id,
          provider: 'paypal',
          direction: 'response',
          eventType: 'capture',
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
            ctx,
          );
          await markProcessed(supa, event.id, 'captured', payment.id);
          await writeAudit(supa, ctx, {
            action: 'webhook_applied',
            entityType: 'payments',
            entityId: payment.id,
            detail: {
              appliedStatus: 'succeeded',
              via: 'capture',
              captureId: capture.captureId ?? orderId,
              amount: capture.amount,
              previousStatus: payment.status,
            },
          });
          return json(req, { ok: true, captured: true });
        }

        await markProcessed(supa, event.id, `capture_${capture.status}`, payment.id);
        await writeAudit(supa, ctx, {
          action: 'webhook_no_change',
          entityType: 'payments',
          entityId: payment.id,
          detail: { reason: `capture_${capture.status}`, orderId, eventId: event.id },
        });
        return json(req, { ok: true, captureStatus: capture.status });
      }

      const outcome = OUTCOME[event.event_type];
      if (!outcome) {
        await markProcessed(supa, event.id, 'not_actionable', payment.id);
        await writeAudit(supa, ctx, {
          action: 'webhook_no_change',
          entityType: 'payments',
          entityId: payment.id,
          detail: { reason: 'not_actionable', eventType: event.event_type, eventId: event.id },
        });
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
        ctx,
      );
      await markProcessed(supa, event.id, outcome, payment.id);
      await writeAudit(supa, ctx, {
        action: 'webhook_applied',
        entityType: 'payments',
        entityId: payment.id,
        detail: {
          appliedStatus: outcome,
          eventType: event.event_type,
          eventId: event.id,
          providerRef: resource.id ?? event.id,
          amount: captured,
          previousStatus: payment.status,
        },
      });
      return json(req, { ok: true, applied: outcome });
    } catch (e) {
      const detail = redactMessage(e instanceof Error ? e.message : 'webhook_error');
      console.error(JSON.stringify({ level: 'error', message: 'paypal_webhook_failed', detail }));
      // Release the gate so PayPal's retry is a real retry, not a dedupe.
      await supa.from('payment_events').delete().eq('provider', 'paypal').eq('event_id', event.id);
      // After the release and never allowed to prevent it: PayPal's retry is
      // worth more than the row describing why the first attempt failed.
      await writeAudit(supa, ctx, {
        action: 'webhook_failed',
        entityType: 'payments',
        detail: { reason: 'apply_failed', detail, eventId: event.id, gateReleased: true },
      });
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
  ctx: PaymentContext,
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
      p_context: ctx,
    });
    await writeAudit(supa, ctx, {
      action: 'webhook_rejected',
      entityType: 'payments',
      entityId: payment.id,
      detail: {
        reason: 'amount_mismatch',
        providerRef,
        expectedAmount: payment.amount,
        confirmedAmount,
      },
    });
    return;
  }

  const { error } = await supa.rpc('record_payment_result', {
    p_payment_id: payment.id,
    p_status: status,
    p_provider_ref: providerRef,
    p_reason: reason,
    // Attributes the payment, the escrow, the ledger legs and the outbox rows
    // this transaction writes to this webhook rather than to 'system'.
    p_context: ctx,
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
