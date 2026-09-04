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
//
// EVERY DECISION HERE IS NOW ON THE RECORD.
// This function used to write one `payment_logs` row — the raw notification —
// and then make five different decisions in silence: dedupe, unknown payment,
// reference mismatch, amount mismatch, apply. Only the last of those changed
// any state, so only the last left any trace at all, and it left it as an
// audit row attributed to nobody: `tg_write_audit` writes `auth.uid()`, which
// under service_role is NULL, and the console rendered that as "system"
// alongside every cron in the database.
//
// The reference-mismatch branch is the reason this matters most. It exists
// because a caller holding one genuinely COMPLETED tracking id could pair it
// with any other pending payment's id — an attempt to have someone else's
// payment marked paid. That is an attack, and until now it produced a
// reconciliation exception and nothing in the audit trail.
//
// So: `actor_kind: 'psp_webhook'`, `actor_label: 'pesapal_ipn'`, the claimed
// origin address, and the correlation id read off the payment — on every
// branch, including the ones that refuse.
import { handler, json } from '../_shared/http.ts';
import { adminClient } from '../_shared/supabase.ts';
import { getTransactionStatus, mapPesapalStatus } from '../_shared/pesapal.ts';
import { paymentContext, withCorrelation, writeAudit, writePaymentLog } from '../_shared/audit.ts';
import { redactMessage } from '../_shared/redact.ts';

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

    // The context for every write below. `req` supplies the claimed origin
    // address — the first thing anyone asks about a suspicious IPN, and a
    // column that has existed on `audit_logs` since 0009 with nothing but the
    // auth trail ever writing it.
    //
    // No correlation id yet: the merchant reference has not been checked
    // against a real payment, and correlating an IPN to a payment we have not
    // confirmed it belongs to is the mistake the reference-mismatch branch
    // below exists to catch.
    let ctx = paymentContext('psp_webhook', 'pesapal_ipn', 'psp-pesapal-webhook', { req });

    // Append-only audit of the raw notification, whatever happens next.
    await writePaymentLog(supa, ctx, {
      provider: 'pesapal',
      direction: 'webhook',
      eventType: 'ipn',
      payload: { orderTrackingId, merchantRef, notificationType },
      signatureValid: true, // no signature scheme; authenticity comes from the re-query
    });

    await writeAudit(supa, ctx, {
      action: 'ipn_received',
      entityType: 'payments',
      // The merchant reference IS our payment id, but it is caller-supplied
      // and unverified at this point. Recorded in the detail rather than as
      // `entity_id`, so an audit row can never assert a link that turns out to
      // be forged. The link is made below, once the re-query confirms it.
      entityId: null,
      detail: { orderTrackingId, merchantRef, notificationType },
    });

    if (!orderTrackingId) {
      await writeAudit(supa, ctx, {
        action: 'ipn_ignored',
        entityType: 'payments',
        detail: { reason: 'no_tracking_id', merchantRef },
      });
      return ack(req, orderTrackingId, merchantRef, true, { ignored: 'no_tracking_id' });
    }

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
        // Recorded, because "the provider told us twice" and "the provider
        // never told us" look identical from the payment row alone, and they
        // are the two competing explanations for a payment stuck pending.
        await writeAudit(supa, ctx, {
          action: 'ipn_deduped',
          entityType: 'payments',
          detail: { orderTrackingId, merchantRef, notificationType },
        });
        return ack(req, orderTrackingId, merchantRef, true, { deduped: true });
      }
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'ipn_gate_failed',
          detail: redactMessage(gateError.message),
        }),
      );
      await writeAudit(supa, ctx, {
        action: 'ipn_failed',
        entityType: 'payments',
        detail: {
          reason: 'gate_failed',
          detail: redactMessage(gateError.message),
          orderTrackingId,
        },
      });
      return ack(req, orderTrackingId, merchantRef, false);
    }

    try {
      const { data: payment } = await supa
        .from('payments')
        .select('id, status, amount, currency, correlation_id')
        .eq('id', merchantRef)
        .maybeSingle();

      if (!payment) {
        // Not a payment we know about. Retrying will not change that.
        await supa
          .from('payment_events')
          .update({ processed_at: new Date().toISOString(), outcome: 'unknown_payment' })
          .eq('provider', 'pesapal')
          .eq('event_id', orderTrackingId);
        await writeAudit(supa, ctx, {
          action: 'ipn_rejected',
          entityType: 'payments',
          detail: { reason: 'unknown_payment', orderTrackingId, merchantRef },
        });
        return ack(req, orderTrackingId, merchantRef, true, { ignored: 'unknown_payment' });
      }

      // From here the payment is real, so everything joins its trace — and
      // the gate row written above is back-filled with it, since it was
      // inserted before we knew which payment it belonged to.
      ctx = withCorrelation(ctx, payment.correlation_id as string | null);
      await supa
        .from('payment_events')
        .update({ correlation_id: ctx.correlation_id })
        .eq('provider', 'pesapal')
        .eq('event_id', orderTrackingId);

      // Authoritative state, straight from Pesapal.
      const status = await getTransactionStatus(orderTrackingId);
      const mapped = mapPesapalStatus(status.statusCode);

      // The response is evidence about a disputed payment, so it is kept —
      // redacted, which for a Pesapal status body removes the payer contact
      // details it echoes back.
      await writePaymentLog(supa, ctx, {
        paymentId: payment.id,
        provider: 'pesapal',
        direction: 'response',
        eventType: 'transaction_status',
        payload: status as unknown as Record<string, unknown>,
      });

      // The two ids on the notification are caller-supplied and were, until
      // now, never checked against each other. `payment` came from the
      // merchant reference and `status` came from the tracking id, so a caller
      // holding one genuinely COMPLETED tracking id could pair it with any
      // other pending payment's id and have that payment recorded as paid.
      // Pesapal echoes the merchant reference we submitted (our payment id)
      // on the status, which is the binding between the two. It has to hold
      // before either the amount or the state is worth reading.
      if (status.merchantReference !== payment.id) {
        await supa.rpc('raise_reconciliation_exception', {
          p_kind: 'psp_amount_mismatch',
          p_dedupe_key: `payment:${payment.id}:reference`,
          p_detail:
            'Pesapal tracking id belongs to a different merchant reference than the payment it was submitted against',
          p_metadata: {
            orderTrackingId,
            submittedReference: merchantRef,
            confirmedReference: status.merchantReference,
          },
          p_expected: payment.amount,
          p_actual: status.amount,
          p_payment_id: payment.id,
          p_severity: 'critical',
          p_context: ctx,
        });
        await supa
          .from('payment_events')
          .update({
            processed_at: new Date().toISOString(),
            outcome: 'reference_mismatch',
            payment_id: payment.id,
          })
          .eq('provider', 'pesapal')
          .eq('event_id', orderTrackingId);

        // The most important audit row this function writes. Somebody paired a
        // tracking id with a payment it does not belong to; whether that was a
        // provider bug or an attempt to have a stranger's booking marked paid
        // is a question for a person, and until now they had nothing to look
        // at but a reconciliation exception.
        await writeAudit(supa, ctx, {
          action: 'ipn_rejected',
          entityType: 'payments',
          entityId: payment.id,
          detail: {
            reason: 'reference_mismatch',
            orderTrackingId,
            submittedReference: merchantRef,
            confirmedReference: status.merchantReference,
            expectedAmount: payment.amount,
            confirmedAmount: status.amount,
          },
        });
        return ack(req, orderTrackingId, merchantRef, true, { held: 'reference_mismatch' });
      }

      // Guard against a transaction being confirmed for the wrong amount.
      // Never auto-correct money — flag it and let Finance look.
      //
      // The currency is part of the amount: 1,000 USD and 1,000 UGX agree on
      // the number and differ by three orders of magnitude, so a number-only
      // comparison would wave the wrong one through.
      if (
        mapped === 'succeeded' &&
        (Math.abs(status.amount - Number(payment.amount)) > 0.01 ||
          status.currency !== payment.currency)
      ) {
        await supa.rpc('raise_reconciliation_exception', {
          p_kind: 'psp_amount_mismatch',
          p_dedupe_key: `payment:${payment.id}:amount`,
          p_detail: 'Pesapal confirmed an amount or currency that differs from the payment record',
          p_metadata: {
            orderTrackingId,
            confirmed: status.amount,
            confirmedCurrency: status.currency,
            expectedCurrency: payment.currency,
          },
          p_expected: payment.amount,
          p_actual: status.amount,
          p_payment_id: payment.id,
          p_severity: 'critical',
          p_context: ctx,
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
        await writeAudit(supa, ctx, {
          action: 'ipn_rejected',
          entityType: 'payments',
          entityId: payment.id,
          detail: {
            reason: 'amount_mismatch',
            orderTrackingId,
            expectedAmount: payment.amount,
            expectedCurrency: payment.currency,
            confirmedAmount: status.amount,
            confirmedCurrency: status.currency,
          },
        });
        return ack(req, orderTrackingId, merchantRef, true, { held: 'amount_mismatch' });
      }

      if (mapped) {
        const { error } = await supa.rpc('record_payment_result', {
          p_payment_id: payment.id,
          p_status: mapped,
          p_provider_ref: orderTrackingId,
          p_reason: mapped === 'succeeded' ? null : status.description,
          // The whole point. Every row the RPC and its triggers write inside
          // this transaction — the payment, the escrow, the ledger legs, the
          // escrow event, the outbox rows — is attributed to this IPN rather
          // than to "system", and lands on the payment's own trace.
          p_context: ctx,
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

      await writeAudit(supa, ctx, {
        action: mapped ? 'ipn_applied' : 'ipn_no_change',
        entityType: 'payments',
        entityId: payment.id,
        detail: {
          orderTrackingId,
          appliedStatus: mapped ?? null,
          providerStatusCode: status.statusCode,
          providerDescription: status.description,
          previousStatus: payment.status,
          amount: status.amount,
          currency: status.currency,
        },
      });

      return ack(req, orderTrackingId, merchantRef, true, { applied: mapped ?? 'no_change' });
    } catch (e) {
      const detail = redactMessage(e instanceof Error ? e.message : 'ipn_error');
      console.error(JSON.stringify({ level: 'error', message: 'ipn_apply_failed', detail }));

      // Release the idempotency gate so Pesapal's retry can genuinely retry
      // rather than being deduped against a delivery we never applied.
      await supa
        .from('payment_events')
        .delete()
        .eq('provider', 'pesapal')
        .eq('event_id', orderTrackingId);

      // Written after the gate is released, and never allowed to prevent it:
      // an audit row is worth less than Pesapal's retry. A delivery that
      // failed mid-apply and was reopened for retry is exactly the sequence
      // that produces a double-settlement scare, so it is on the record.
      await writeAudit(supa, ctx, {
        action: 'ipn_failed',
        entityType: 'payments',
        detail: { reason: 'apply_failed', detail, orderTrackingId, gateReleased: true },
      });

      return ack(req, orderTrackingId, merchantRef, false, { error: detail });
    }
  }),
);
