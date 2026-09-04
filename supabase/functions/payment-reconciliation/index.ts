// payment-reconciliation — cron, hourly. Cross-checks internal state against
// the PSPs and against the ledger, and files anything that does not agree into
// the exception queue.
//
// It never auto-corrects money. The one thing it does write is the *PSP's own*
// authoritative answer for a payment whose webhook was lost — and that goes
// through the same record_payment_result the webhooks use, so it obeys the
// same terminal-state rules.
//
// WHY THIS SWEEP NEEDED ITS OWN ACTOR KIND.
// It calls the same `record_payment_result` the webhooks do, and until 0904a
// produced the same audit row: `actor_id` null, rendered as "system". But a
// payment resolved here means something a payment resolved by an IPN does not
// — the webhook never arrived, or arrived and failed — and that is the
// difference between "routine" and "our provider integration is dropping
// deliveries". `actor_kind: 'reconciliation'` is deliberately separate from
// 'cron' for that reason: the question is not "was this scheduled" but "did
// something disagree".
//
// It passes no correlation id, because it did not open the checkout — that
// happened at least an hour earlier, in a different process. The RPC adopts
// the one already on the payment row (`_ensure_correlation`), so the sweep's
// postings land on the original story rather than starting a second one about
// the same money.
import { handler, json } from '../_shared/http.ts';
import { adminClient, isServiceRoleCaller, HttpError } from '../_shared/supabase.ts';
import { getTransactionStatus, mapPesapalStatus } from '../_shared/pesapal.ts';
import { getOrder } from '../_shared/paypal.ts';
import {
  paymentContext,
  withCorrelation,
  writeAudit,
  writePaymentLog,
  type PaymentContext,
} from '../_shared/audit.ts';
import { redactMessage } from '../_shared/redact.ts';

type Supa = ReturnType<typeof adminClient>;

// No `req` is passed: the address and user agent on a cron's own HTTP call
// belong to Supabase's infrastructure talking to itself, not to a caller, and
// recording them would put a meaningless value in a column an investigator
// reads as "where did this come from". 0802e's header makes the same point
// about why `tg_write_audit` cannot read `request.headers` and be believed.
const CTX: PaymentContext = paymentContext(
  'reconciliation',
  'payment-reconciliation',
  'payment-reconciliation',
);

const STUCK_AFTER_MS = 60 * 60 * 1000;
const LIMIT = 200;

Deno.serve(
  handler(async (req) => {
    // Cron-only. The gateway does not verify a JWT here (config.toml), so the
    // handler is the only gate: without it, anyone who found the URL could
    // re-query every stuck payment against the PSPs and apply the result, or
    // flood Finance's queue with exceptions. pg_cron presents the
    // service-role key as its bearer, which is the one thing a browser cannot.
    if (!isServiceRoleCaller(req)) throw new HttpError(401, 'unauthorized');

    const supa = adminClient();
    const summary = { requeried: 0, resolved: 0, exceptions: 0, errors: [] as string[] };

    summary.resolved += await sweepStuckPayments(supa, summary);
    summary.exceptions += await sweepUnbalancedEscrows(supa);
    summary.exceptions += await sweepOrphanEscrows(supa);
    summary.exceptions += await sweepUnreferencedFundingPayments(supa);
    summary.exceptions += await sweepLedgerAccounts(supa);

    // One digest to Finance rather than one alert per finding.
    const { count } = await supa
      .from('reconciliation_exceptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open');

    if ((count ?? 0) > 0) {
      const { data: admins } = await supa
        .from('user_roles')
        .select('profile_id, roles!inner(is_admin)')
        .eq('roles.is_admin', true);

      for (const a of admins ?? []) {
        await supa.from('outbox').insert({
          aggregate_type: 'reconciliation_exceptions',
          aggregate_id: (a as { profile_id: string }).profile_id,
          event_type: 'finance.reconciliation_alert',
          payload: {
            recipient_id: (a as { profile_id: string }).profile_id,
            audience: 'admin',
            count,
          },
          status: 'pending',
          available_at: new Date().toISOString(),
        });
      }
    }

    return json(req, { ok: true, openExceptions: count ?? 0, ...summary });
  }),
);

/**
 * Payments still in flight past the stuck threshold. Asks the PSP what
 * actually happened.
 *
 * The old version required `provider_ref` to be set but nothing ever set it,
 * so this sweep matched nothing and quietly did no work at all. It is now
 * written at checkout creation; a payment that still has none never reached a
 * PSP and is filed rather than re-queried.
 */
async function sweepStuckPayments(
  supa: Supa,
  summary: { requeried: number; errors: string[] },
): Promise<number> {
  const cutoff = new Date(Date.now() - STUCK_AFTER_MS).toISOString();
  const { data: stuck } = await supa
    .from('payments')
    .select('id, provider, provider_ref, status, amount, created_at, correlation_id')
    .in('status', ['pending', 'processing'])
    .lt('created_at', cutoff)
    .limit(LIMIT);

  let resolved = 0;

  for (const p of stuck ?? []) {
    // Each payment is worked under its OWN trace. One sweep touches many
    // unrelated checkouts, so a single sweep-wide context would put every one
    // of them on the same correlation id and the trace would stop meaning
    // "this transaction".
    const ctx = withCorrelation(CTX, p.correlation_id as string | null);

    if (!p.provider_ref) {
      await raise(supa, ctx, {
        kind: 'orphan_payment',
        dedupe: `payment:${p.id}:no_provider_ref`,
        detail:
          'Payment has been in flight for over an hour with no provider reference — checkout was never created',
        paymentId: p.id,
        severity: 'warning',
      });
      continue;
    }

    try {
      summary.requeried++;
      let mapped: 'succeeded' | 'failed' | 'refunded' | null = null;
      let confirmed = 0;
      let providerStatus = '';

      if (p.provider === 'pesapal') {
        const st = await getTransactionStatus(p.provider_ref);
        mapped = mapPesapalStatus(st.statusCode);
        confirmed = st.amount;
        providerStatus = String(st.statusCode);
        await writePaymentLog(supa, ctx, {
          paymentId: p.id,
          provider: 'pesapal',
          direction: 'response',
          eventType: 'reconciliation_requery',
          payload: st as unknown as Record<string, unknown>,
        });
      } else {
        const order = await getOrder(p.provider_ref);
        mapped =
          order.status === 'COMPLETED'
            ? 'succeeded'
            : order.status === 'DECLINED'
              ? 'failed'
              : null;
        confirmed = order.amount;
        providerStatus = order.status;
        await writePaymentLog(supa, ctx, {
          paymentId: p.id,
          provider: 'paypal',
          direction: 'response',
          eventType: 'reconciliation_requery',
          payload: order as unknown as Record<string, unknown>,
        });
      }

      // The re-query itself, and what the provider said. This is the row that
      // answers "how long was this payment stuck, and what did the PSP
      // actually think during that time" — a question the sweep has always
      // been able to answer and has never recorded.
      await writeAudit(supa, ctx, {
        action: 'reconciliation_requery',
        entityType: 'payments',
        entityId: p.id,
        detail: {
          provider: p.provider,
          providerRef: p.provider_ref,
          providerStatus,
          mappedTo: mapped,
          confirmedAmount: confirmed,
          expectedAmount: Number(p.amount),
          internalStatus: p.status,
          stuckSince: p.created_at,
        },
      });

      if (!mapped) continue; // genuinely still in flight

      if (
        mapped === 'succeeded' &&
        confirmed > 0 &&
        Math.abs(confirmed - Number(p.amount)) > 0.01
      ) {
        await raise(supa, ctx, {
          kind: 'psp_amount_mismatch',
          dedupe: `payment:${p.id}:amount`,
          detail: 'PSP reports a different amount than the payment record',
          paymentId: p.id,
          expected: Number(p.amount),
          actual: confirmed,
          severity: 'critical',
        });
        continue;
      }

      const { error } = await supa.rpc('record_payment_result', {
        p_payment_id: p.id,
        p_status: mapped,
        p_provider_ref: p.provider_ref,
        p_reason: mapped === 'succeeded' ? null : 'resolved_by_reconciliation',
        p_context: ctx,
      });
      if (error) throw new Error(error.message);
      resolved++;

      await writeAudit(supa, ctx, {
        action: 'reconciliation_applied',
        entityType: 'payments',
        entityId: p.id,
        detail: {
          appliedStatus: mapped,
          previousStatus: p.status,
          providerRef: p.provider_ref,
          reason: 'webhook_never_arrived_or_failed',
        },
      });
    } catch (e) {
      const detail = redactMessage(e instanceof Error ? e.message : 'requery_failed');
      summary.errors.push(`${p.id}: ${detail}`);
      await raise(supa, ctx, {
        kind: 'stuck_payment',
        dedupe: `payment:${p.id}:requery`,
        detail: `Could not reach the provider to resolve a stuck payment: ${detail}`,
        paymentId: p.id,
        severity: 'warning',
      });
    }
  }

  return resolved;
}

/**
 * Per-escrow double-entry check. Every balanced group nets to zero, so the sum
 * across all of an escrow's groups must too — any drift means a leg was
 * written outside `post_ledger`.
 */
async function sweepUnbalancedEscrows(supa: Supa): Promise<number> {
  const { data: active } = await supa
    .from('escrow_transactions')
    .select('id, gross_amount, currency')
    .not('status', 'in', '("initiated","failed")')
    .limit(LIMIT);

  let raised = 0;

  for (const e of active ?? []) {
    const { data: legs } = await supa
      .from('ledger_entries')
      .select('direction, amount')
      .eq('escrow_id', e.id);

    const debit = (legs ?? [])
      .filter((l) => l.direction === 'debit')
      .reduce((s, l) => s + Number(l.amount), 0);
    const credit = (legs ?? [])
      .filter((l) => l.direction === 'credit')
      .reduce((s, l) => s + Number(l.amount), 0);

    if (Math.abs(debit - credit) > 0.01) {
      await raise(supa, CTX, {
        kind: 'unbalanced_escrow',
        dedupe: `escrow:${e.id}:unbalanced`,
        detail: `Ledger does not balance: debits ${debit} vs credits ${credit}`,
        escrowId: e.id,
        expected: debit,
        actual: credit,
        severity: 'critical',
      });
      raised++;
    }
  }

  return raised;
}

/** Escrow that believes it is funded but has no successful payment behind it. */
async function sweepOrphanEscrows(supa: Supa): Promise<number> {
  const { data: funded } = await supa
    .from('escrow_transactions')
    .select(
      'id, funding_payment_id, gross_amount, payments!escrow_transactions_funding_payment_id_fkey(status)',
    )
    .in('status', ['held', 'awaiting_advance', 'advance_released'])
    .limit(LIMIT);

  let raised = 0;

  for (const e of funded ?? []) {
    const payment = e.payments as unknown as { status: string } | { status: string }[] | null;
    const status = Array.isArray(payment) ? payment[0]?.status : payment?.status;
    if (status === 'succeeded') continue;

    await raise(supa, CTX, {
      kind: 'orphan_payment',
      dedupe: `escrow:${e.id}:no_successful_payment`,
      detail: `Escrow is holding funds but its funding payment is '${status ?? 'missing'}'`,
      escrowId: e.id,
      paymentId: (e.funding_payment_id as string) ?? undefined,
      expected: Number(e.gross_amount),
      severity: 'critical',
    });
    raised++;
  }

  return raised;
}

/**
 * The mirror image of `sweepOrphanEscrows`: a payment that succeeded for
 * escrow funding but that no escrow claims as its funding payment.
 *
 * That is money received against nothing. It is how a double checkout
 * showed up before `activate_escrow` refused one — the escrow was re-pointed
 * at the second payment, the first was paid anyway, and `fund_escrow` waved
 * the second IPN through as already funded. The orphan-escrow sweep cannot
 * see it because it only reads the CURRENT funding payment, which did
 * succeed. Read from the payments side instead, through an anti-join in
 * `unreferenced_funding_payments`, and file each one as critical.
 */
async function sweepUnreferencedFundingPayments(supa: Supa): Promise<number> {
  const { data: orphans, error } = await supa.rpc('unreferenced_funding_payments', {
    p_limit: LIMIT,
  });
  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'unreferenced_funding_payments_failed',
        detail: error.message,
      }),
    );
    return 0;
  }

  let raised = 0;

  for (const p of (orphans ?? []) as Array<{
    payment_id: string;
    booking_id: string | null;
    escrow_id: string | null;
    amount: number;
    currency: string;
    provider: string;
    provider_ref: string | null;
    paid_at: string | null;
  }>) {
    await raise(supa, CTX, {
      kind: 'orphan_payment',
      dedupe: `payment:${p.payment_id}:unreferenced_success`,
      detail:
        `Payment succeeded for escrow funding (${p.provider} ${p.provider_ref ?? 'no ref'}, ` +
        `${p.amount} ${p.currency}) but no escrow records it as its funding payment — ` +
        'money received against nothing',
      paymentId: p.payment_id,
      escrowId: p.escrow_id ?? undefined,
      expected: Number(p.amount),
      actual: 0,
      severity: 'critical',
    });
    raised++;
  }

  return raised;
}

/**
 * Control-account check. `escrow_held` is money we are supposed to be holding
 * right now; it must equal the gross of every escrow that has not yet been
 * released or refunded. A drift here is a systemic problem, not a per-record
 * one, so it is raised once with the whole picture.
 */
async function sweepLedgerAccounts(supa: Supa): Promise<number> {
  const { data: legs } = await supa
    .from('ledger_entries')
    .select('direction, amount')
    .eq('account', 'escrow_held');

  const held = (legs ?? []).reduce(
    (s, l) => s + (l.direction === 'credit' ? Number(l.amount) : -Number(l.amount)),
    0,
  );

  const { data: openEscrows } = await supa
    .from('escrow_transactions')
    .select('gross_amount')
    .in('status', [
      'held',
      'awaiting_advance',
      'advance_released',
      'release_requested',
      'disputed',
    ]);

  const expected = (openEscrows ?? []).reduce((s, e) => s + Number(e.gross_amount), 0);

  // Escrows mid-release legitimately differ for the moment between the release
  // ledger posting and the payout settling, so allow a small tolerance and
  // rely on the per-escrow sweep for anything structural.
  if (Math.abs(held - expected) > 1) {
    await raise(supa, CTX, {
      kind: 'unbalanced_escrow',
      dedupe: 'control:escrow_held',
      detail: 'escrow_held control account does not match the sum of open escrows',
      expected,
      actual: held,
      severity: 'critical',
    });
    return 1;
  }

  return 0;
}

/**
 * File a finding, and record which sweep filed it.
 *
 * `ctx` carries a correlation id only where the sweep already had one to hand
 * (the stuck-payment sweep reads it off the payment row). Everywhere else the
 * module-level `CTX` is passed and the RPC resolves the trace itself from
 * `p_payment_id`, or from the escrow's funding payment — see
 * `_ensure_correlation` in 20260904000001.
 */
async function raise(
  supa: Supa,
  ctx: PaymentContext,
  opts: {
    kind: string;
    dedupe: string;
    detail: string;
    escrowId?: string;
    paymentId?: string;
    payoutId?: string;
    expected?: number;
    actual?: number;
    severity?: string;
  },
): Promise<void> {
  const { error } = await supa.rpc('raise_reconciliation_exception', {
    p_kind: opts.kind,
    p_dedupe_key: opts.dedupe,
    p_detail: opts.detail,
    p_metadata: {},
    p_expected: opts.expected ?? null,
    p_actual: opts.actual ?? null,
    p_escrow_id: opts.escrowId ?? null,
    p_payment_id: opts.paymentId ?? null,
    p_payout_id: opts.payoutId ?? null,
    p_severity: opts.severity ?? 'warning',
    p_context: ctx,
  });
  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'raise_exception_failed',
        detail: redactMessage(error.message),
      }),
    );
    return;
  }

  // Which sweep filed a finding changes what a person does about it. An
  // `orphan_payment` from `create-payment` means a checkout was opened and its
  // reference could not be stored; the same kind from here means a payment
  // succeeded against nothing. Same row shape, different emergency — and the
  // exception row alone does not say which.
  await writeAudit(supa, ctx, {
    action: 'exception_raised',
    entityType: 'reconciliation_exceptions',
    entityId: opts.paymentId ?? opts.escrowId ?? opts.payoutId ?? null,
    detail: {
      kind: opts.kind,
      dedupeKey: opts.dedupe,
      severity: opts.severity ?? 'warning',
      detail: opts.detail,
      expected: opts.expected ?? null,
      actual: opts.actual ?? null,
      escrowId: opts.escrowId ?? null,
      paymentId: opts.paymentId ?? null,
      payoutId: opts.payoutId ?? null,
    },
  });
}
