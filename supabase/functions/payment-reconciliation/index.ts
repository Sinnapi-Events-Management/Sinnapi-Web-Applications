// payment-reconciliation — cron, hourly. Cross-checks internal state against
// the PSPs and against the ledger, and files anything that does not agree into
// the exception queue.
//
// It never auto-corrects money. The one thing it does write is the *PSP's own*
// authoritative answer for a payment whose webhook was lost — and that goes
// through the same record_payment_result the webhooks use, so it obeys the
// same terminal-state rules.
import { handler, json } from '../_shared/http.ts';
import { adminClient } from '../_shared/supabase.ts';
import { getTransactionStatus, mapPesapalStatus } from '../_shared/pesapal.ts';
import { getOrder } from '../_shared/paypal.ts';

type Supa = ReturnType<typeof adminClient>;

const STUCK_AFTER_MS = 60 * 60 * 1000;
const LIMIT = 200;

Deno.serve(
  handler(async (req) => {
    const supa = adminClient();
    const summary = { requeried: 0, resolved: 0, exceptions: 0, errors: [] as string[] };

    summary.resolved += await sweepStuckPayments(supa, summary);
    summary.exceptions += await sweepUnbalancedEscrows(supa);
    summary.exceptions += await sweepOrphanEscrows(supa);
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
    .select('id, provider, provider_ref, status, amount, created_at')
    .in('status', ['pending', 'processing'])
    .lt('created_at', cutoff)
    .limit(LIMIT);

  let resolved = 0;

  for (const p of stuck ?? []) {
    if (!p.provider_ref) {
      await raise(supa, {
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

      if (p.provider === 'pesapal') {
        const st = await getTransactionStatus(p.provider_ref);
        mapped = mapPesapalStatus(st.statusCode);
        confirmed = st.amount;
      } else {
        const order = await getOrder(p.provider_ref);
        mapped =
          order.status === 'COMPLETED'
            ? 'succeeded'
            : order.status === 'DECLINED'
              ? 'failed'
              : null;
        confirmed = order.amount;
      }

      if (!mapped) continue; // genuinely still in flight

      if (
        mapped === 'succeeded' &&
        confirmed > 0 &&
        Math.abs(confirmed - Number(p.amount)) > 0.01
      ) {
        await raise(supa, {
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
      });
      if (error) throw new Error(error.message);
      resolved++;
    } catch (e) {
      const detail = e instanceof Error ? e.message : 'requery_failed';
      summary.errors.push(`${p.id}: ${detail}`);
      await raise(supa, {
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
      await raise(supa, {
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

    await raise(supa, {
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
    await raise(supa, {
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

async function raise(
  supa: Supa,
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
  });
  if (error) {
    console.error(
      JSON.stringify({ level: 'error', message: 'raise_exception_failed', detail: error.message }),
    );
  }
}
