// audit — the Edge side of the payment audit trail.
//
// WHAT WAS MISSING
// No Edge Function wrote `audit_logs`. Not one. The two webhooks and
// `create-payment` wrote `payment_logs` — raw provider traffic — and nothing
// else, so every decision the functions made ON THEIR OWN was invisible to the
// console:
//
//   * a checkout refused because the booking's terms were not accepted
//   * an IPN deduped against a delivery already applied
//   * an IPN held because the tracking id belonged to a different merchant
//     reference (a genuine attempt to have someone else's payment marked paid)
//   * an IPN held because the confirmed amount or currency did not match
//   * a reconciliation re-query and what the provider said
//   * an exception raised, and by which sweep
//
// Some of those left a `console.error` in the Supabase log, which is retained
// for days and is not queryable next to the payment it concerns. Some left
// nothing at all. All of them are the answer to "why did this payment not
// settle", and none of them were on the record.
//
// WHY A HELPER AND NOT AN INSERT PER SITE
// The shape has to be identical everywhere or the console cannot filter on it.
// Nineteen call sites each building their own object is nineteen chances to
// write `actor_label: 'pesapal'` instead of `'pesapal_ipn'`, and the Audit
// page's actor filter would then quietly have two buckets for one webhook.
// This is also the only place redaction can be made unavoidable: `writeAudit`
// runs every payload through `redact()`, so a call site cannot forget.
//
// NEVER THROWS. Every function here swallows its own failure and logs loudly,
// following `_auth_audit` (0802e:169), whose header puts it best: this is
// telemetry hanging off the side of a payment, and a failure to describe an
// event must not become a failure to perform it. An IPN that cannot write its
// audit row must still settle the payment; the alternative is a provider retry
// storm caused by the logging.
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { redact, redactMessage } from './redact.ts';

/**
 * What sort of thing is acting. Mirrors the `audit_actor_kind` enum added by
 * 20260904000001; a value not in this union is rejected by the database.
 *
 * `user` is only ever correct when a real JWT identity is behind the call. The
 * database clamps this — `_set_payment_context` forces 'user' whenever
 * `auth.uid()` is present and ignores the claim — so a function that guesses
 * wrong is corrected rather than believed.
 */
export type ActorKind = 'user' | 'psp_webhook' | 'cron' | 'reconciliation' | 'system';

/**
 * The context threaded into every money RPC and every audit row.
 *
 * This is the object that goes into `p_context`. It exists because
 * `set_config(..., true)` is transaction-local and every supabase-js `.rpc()`
 * call is its own transaction — so a "set context" call followed by a
 * "do the work" call cannot work, and the context has to travel as an
 * argument. See the header of 20260904000003 for the full reasoning.
 */
export type PaymentContext = {
  actor_kind: ActorKind;
  /**
   * The person, when a service-role call is acting on an authenticated
   * caller's behalf.
   *
   * `create-payment` is the case this exists for: it authenticates the payer
   * with `requireUser`, then does its privileged half — attaching the provider
   * reference, failing a payment the PSP refused — through the admin client,
   * where the database sees no `auth.uid()`. Those writes were caused by a
   * person, and `_set_payment_context` will only accept `actor_kind: 'user'`
   * from a service-role caller that names who.
   */
  actor_id?: string | null;
  /** Which one: 'pesapal_ipn', 'payment-reconciliation', 'escrow-lifecycle'. */
  actor_label: string;
  /** The trace. Absent only before a payment exists to take one from. */
  correlation_id?: string | null;
  /** This function's name, as deployed. */
  source: string;
  ip?: string | null;
  user_agent?: string | null;
};

/** A payment-flow decision worth recording. */
export type AuditEntry = {
  /**
   * What happened, as a stable slug: `checkout_created`, `checkout_refused`,
   * `ipn_received`, `ipn_deduped`, `ipn_applied`, `ipn_rejected`,
   * `reconciliation_requery`, `exception_raised`, `exception_resolved`.
   *
   * Deliberately NOT the `${op}_${table}` shape `tg_write_audit` generates.
   * A trigger row says a column changed; these say a decision was taken, and
   * the Audit page's operation filter keys off the trigger prefix — so a
   * function-written action must not look like one.
   */
  action: string;
  /** Usually 'payments'. Whatever the decision was about. */
  entityType: string;
  entityId?: string | null;
  /** Detail. Redacted before it is written; see redact.ts. */
  detail?: Record<string, unknown> | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Build the context a function passes to every RPC and every audit row.
 *
 * `source` is the function's own name and is not derived from the request:
 * a header-derived source could be set by whoever is calling, and the one
 * thing this field must be is true.
 */
export function paymentContext(
  actorKind: ActorKind,
  actorLabel: string,
  source: string,
  opts: {
    correlationId?: string | null;
    /** Required for `actor_kind: 'user'` on a service-role call. */
    actorId?: string | null;
    req?: Request;
  } = {},
): PaymentContext {
  return {
    actor_kind: actorKind,
    actor_label: actorLabel,
    source,
    actor_id: normaliseUuid(opts.actorId),
    correlation_id: normaliseUuid(opts.correlationId),
    ...(opts.req ? requestOrigin(opts.req) : {}),
  };
}

/**
 * Return a copy of the context carrying a correlation id.
 *
 * A webhook does not know the trace until it has found the payment, which
 * happens several decisions in — the "IPN received" row is written before
 * there is anything to correlate it to. Rather than mutating a shared object
 * (and silently back-dating the id onto rows already written), each stage
 * derives the context it needs.
 */
export function withCorrelation(
  ctx: PaymentContext,
  correlationId: string | null | undefined,
): PaymentContext {
  return { ...ctx, correlation_id: normaliseUuid(correlationId) ?? ctx.correlation_id ?? null };
}

/**
 * The caller's address and user agent, where they are genuinely the caller's.
 *
 * Only meaningful on a function reached from outside — a browser or a
 * provider's IPN. It is NOT meaningful for the value a cron's own HTTP call
 * carries, which is Supabase's own infrastructure talking to itself; 0802e's
 * header makes the same point about why `tg_write_audit` cannot read
 * `request.headers` and be believed. So the sweeps do not call this.
 *
 * `x-forwarded-for` is a list; the first entry is the client as the edge saw
 * it. It is caller-supplied and therefore a claim, not a fact — recorded
 * because a claimed address is still the best evidence available about where
 * an IPN came from, and because the database refuses anything that will not
 * cast to `inet`.
 */
export function requestOrigin(req: Request): { ip: string | null; user_agent: string | null } {
  const forwarded = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim();
  const real = (req.headers.get('x-real-ip') ?? '').trim();
  const ip = forwarded || real || null;
  const ua = (req.headers.get('user-agent') ?? '').trim() || null;
  return { ip, user_agent: ua ? ua.slice(0, 512) : null };
}

/**
 * Write one audit row for a decision this function made.
 *
 * `actor_id` is set only when the context carries one — that is,
 * `create-payment` naming the payer it authenticated. For a webhook or a
 * sweep it stays null: there is no profile to attribute them to, and
 * inventing one would be the lie 0802e refuses to tell about a failed
 * sign-in. `actor_kind` and `actor_label` are the attribution there.
 *
 * Written through PostgREST rather than through an RPC because `audit_logs`
 * is append-only and an insert is exactly what is wanted — but note the
 * consequence: the trigger-set GUC context does NOT apply to a direct insert,
 * so every column has to be supplied here explicitly. That is why this helper
 * exists rather than a bare `.insert()` at each site.
 */
export async function writeAudit(
  supa: SupabaseClient,
  ctx: PaymentContext,
  entry: AuditEntry,
): Promise<void> {
  try {
    const { error } = await supa.from('audit_logs').insert({
      actor_id: ctx.actor_id ?? null,
      actor_kind: ctx.actor_kind,
      actor_label: ctx.actor_label,
      correlation_id: normaliseUuid(ctx.correlation_id),
      source: ctx.source,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: normaliseUuid(entry.entityId),
      before: null,
      after: entry.detail ? redact(entry.detail) : null,
      ip_address: ctx.ip ?? null,
      user_agent: ctx.user_agent ?? null,
    });
    if (error) throw new Error(error.message);
  } catch (e) {
    // Loud, and swallowed. The payment is what must land.
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'audit_write_failed',
        action: entry.action,
        source: ctx.source,
        detail: redactMessage(e instanceof Error ? e.message : 'unknown'),
      }),
    );
  }
}

/**
 * Write one raw-provider-traffic row.
 *
 * Wraps the `payment_logs` insert the three payment functions were already
 * doing by hand, and adds the two things they were missing: the correlation
 * id, and redaction. `psp-paypal-webhook` stored PayPal's entire event body
 * — payer email, name, address and truncated card metadata included — because
 * `payload: event` is the obvious thing to write. Going through here makes
 * that impossible rather than discouraged.
 */
export async function writePaymentLog(
  supa: SupabaseClient,
  ctx: PaymentContext,
  entry: {
    paymentId?: string | null;
    provider: 'pesapal' | 'paypal';
    direction: 'request' | 'response' | 'webhook';
    eventType: string;
    httpStatus?: number | null;
    signatureValid?: boolean | null;
    payload: unknown;
  },
): Promise<void> {
  try {
    const { error } = await supa.from('payment_logs').insert({
      payment_id: normaliseUuid(entry.paymentId),
      provider: entry.provider,
      direction: entry.direction,
      event_type: entry.eventType,
      http_status: entry.httpStatus ?? null,
      signature_valid: entry.signatureValid ?? null,
      payload: redact(entry.payload),
      correlation_id: normaliseUuid(ctx.correlation_id),
    });
    if (error) throw new Error(error.message);
  } catch (e) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'payment_log_write_failed',
        eventType: entry.eventType,
        source: ctx.source,
        detail: redactMessage(e instanceof Error ? e.message : 'unknown'),
      }),
    );
  }
}

/**
 * Read a payment's correlation id.
 *
 * The webhooks and the reconciliation sweep did not open the checkout, so
 * they learn the trace from the payment row. Returns null rather than throwing
 * for an unknown payment — an IPN for a merchant reference we do not
 * recognise is a thing that happens, and it still deserves its audit row.
 */
export async function correlationFor(
  supa: SupabaseClient,
  paymentId: string,
): Promise<string | null> {
  const { data } = await supa
    .from('payments')
    .select('correlation_id')
    .eq('id', paymentId)
    .maybeSingle();
  return (data?.correlation_id as string | null) ?? null;
}

/** Anything that is not a uuid becomes null; the columns are typed `uuid`. */
function normaliseUuid(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return UUID.test(v) ? v : null;
}
