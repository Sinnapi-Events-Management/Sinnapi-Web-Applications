// create-payment — user-invoked. Opens a hosted PSP checkout for a booking
// (escrow funding) or for a vendor's subscription plan.
//
// Every figure is derived server-side — inside activate_escrow from the
// booking, or inside activate_subscription_payment from the plan. Nothing
// money-shaped is accepted from the request body: the caller chooses only
// *what they are paying for* and *which rail*.
//
// The body is a discriminated union, validated so a caller cannot send both:
//   { bookingId, provider, method }            escrow funding, by the client
//   { planId, vendorId, provider, method }     subscription, by the vendor owner
//
// Idempotent on the `Idempotency-Key` header. The browser sends one stable
// key per checkout attempt; a repeat of the same request — a double-click, a
// retried fetch, a tab restored from history — reaches the RPC with the same
// key and is handed the payment it already opened, complete with the
// checkout URL it was given the first time. No second PSP order is ever
// submitted for it. Without a key, the RPC still refuses a second call while
// the first checkout is live; the key only makes the repeat *succeed* rather
// than be refused.
//
// Every decision this function makes on its own is now on the record — the
// checkout it created, the checkout it refused and why, the replay it handed
// back — and everything it writes carries the correlation id the RPC minted,
// so one id reads the whole story back out (0904b, 0904e). The payer's billing
// contact is forwarded to the provider and deliberately not logged: the audit
// row says which fields were sent, never their values.
import { handler, json } from '../_shared/http.ts';
import { userClient, adminClient, requireUser, HttpError } from '../_shared/supabase.ts';
import { submitOrder } from '../_shared/pesapal.ts';
import { createOrder } from '../_shared/paypal.ts';
import {
  paymentContext,
  withCorrelation,
  writeAudit,
  writePaymentLog,
  type PaymentContext,
} from '../_shared/audit.ts';
import { redactMessage } from '../_shared/redact.ts';

type Provider = 'pesapal' | 'paypal';
type Method = 'mtn_momo' | 'airtel_money' | 'card';

type EscrowBody = { bookingId: string; provider: Provider; method: Method };
type SubscriptionBody = { planId: string; vendorId: string; provider: Provider; method: Method };

type EscrowActivation = {
  payment_id: string;
  escrow_id: string;
  amount: number;
  currency: string;
  provider_ref: string | null;
  checkout_url: string | null;
  correlation_id: string | null;
};

type SubscriptionActivation = {
  payment_id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  plan_name: string;
  billing_cycle: 'monthly' | 'annual';
  provider_ref: string | null;
  checkout_url: string | null;
  correlation_id: string | null;
};

/** What the two branches have in common once the RPC has answered. */
type Opened = {
  purpose: 'escrow_funding' | 'subscription';
  paymentId: string;
  amount: number;
  currency: string;
  providerRef: string | null;
  checkoutUrl: string | null;
  /** What the PSP's page says the vendor or client is paying for. */
  description: string;
  /** Where the PSP sends the browser afterwards; null keeps the default. */
  callbackUrl: string | null;
  /** The id the exception and the response are keyed on for this purpose. */
  escrowId: string | null;
  subscriptionId: string | null;
  /**
   * The trace, minted by the RPC. Everything this function does afterwards —
   * the PSP submission, the provider-reference attach, the raw-traffic log,
   * every audit row — carries it, so one id answers "what happened to this
   * checkout" across all seven tables.
   */
  correlationId: string | null;
};

const PROVIDERS = new Set(['pesapal', 'paypal']);
const METHODS = new Set(['mtn_momo', 'airtel_money', 'card']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Opaque, URL-safe, bounded. The key is stored against the payment row and
// compared by equality; it is never interpreted, so the shape only has to be
// unambiguous and short enough not to be abused as a storage channel.
const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{8,128}$/;

Deno.serve(
  handler(async (req) => {
    const userId = await requireUser(req);
    const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const body = readBody(raw);
    const idempotencyKey = readIdempotencyKey(req);

    const supa = userClient(req);
    const admin = adminClient();

    // The context for everything this function does. `actor_kind: 'user'` with
    // the payer named: the RPCs below are reached through the admin client, so
    // the database sees no `auth.uid()` and will only accept an attribution to
    // a person if it is told which person. The correlation id is not known yet
    // — the RPC mints it — so it is filled in by `withCorrelation` once it is.
    const checkoutLabel = 'bookingId' in body ? 'client_checkout' : 'vendor_checkout';
    let ctx = paymentContext('user', checkoutLabel, 'create-payment', {
      actorId: userId,
      req,
    });

    // Ownership, state, pricing, the one-checkout-at-a-time guard and the
    // idempotent replay are all handled inside the RPC under the caller's
    // own identity.
    //
    // A refusal is recorded rather than only returned. "Why can this client
    // not pay?" was previously answerable only from the HTTP response the
    // browser got and threw away: terms not accepted, a booking not confirmed,
    // a checkout already in flight, a plan retired mid-session. Each of those
    // is a support conversation, and none of them left a trace.
    let opened: Opened;
    try {
      opened =
        'bookingId' in body
          ? await openEscrow(supa, body, idempotencyKey, ctx)
          : await openSubscription(supa, body, idempotencyKey, ctx);
    } catch (e) {
      const reason = e instanceof Error ? redactMessage(e.message) : 'activation_failed';
      await writeAudit(admin, ctx, {
        action: 'checkout_refused',
        entityType: 'bookingId' in body ? 'bookings' : 'pricing_plans',
        entityId: 'bookingId' in body ? body.bookingId : body.planId,
        detail: {
          reason,
          provider: body.provider,
          method: body.method,
          purpose: 'bookingId' in body ? 'escrow_funding' : 'subscription',
          vendorId: 'vendorId' in body ? body.vendorId : null,
        },
      });
      throw e;
    }

    const { paymentId, amount, currency, escrowId, subscriptionId, purpose } = opened;
    ctx = withCorrelation(ctx, opened.correlationId);

    // A replay. The PSP already holds an order for this payment id, and a
    // second SubmitOrderRequest for the same reference is a second charge
    // waiting to happen. Hand back the checkout it already has.
    if (opened.providerRef) {
      if (!opened.checkoutUrl) {
        // Referenced at the PSP but the page to pay on was not kept — a row
        // from before checkout URLs were stored, or an attach that only half
        // landed. Nothing safe to hand back; the in-flight guard will fail
        // the attempt once it lapses and the next Pay opens a fresh one.
        await writeAudit(admin, ctx, {
          action: 'checkout_refused',
          entityType: 'payments',
          entityId: paymentId,
          detail: { reason: 'referenced_at_provider_without_checkout_url', purpose },
        });
        throw new HttpError(409, 'payment_already_in_flight');
      }

      // Worth its own row rather than silence. A payer who taps Pay four times
      // produces one payment and three replays, and an investigator looking at
      // a duplicate-charge complaint needs to see that the duplicates were
      // refused — not infer it from their absence.
      await writeAudit(admin, ctx, {
        action: 'checkout_replayed',
        entityType: 'payments',
        entityId: paymentId,
        detail: { purpose, provider: body.provider, method: body.method, amount, currency },
      });

      return json(req, {
        purpose,
        paymentId,
        escrowId,
        subscriptionId,
        checkoutUrl: opened.checkoutUrl,
        amount,
        currency,
        correlationId: opened.correlationId,
        replayed: true,
      });
    }

    // Billing contact is a convenience for the PSP's own form, never a source
    // of truth — it cannot affect what is charged.
    //
    // These values are personal data and are deliberately NOT logged. What is
    // recorded below is which fields were sent, by name — enough for an
    // investigator to know the PSP had a way to reach the payer, without a
    // second copy of their email and phone number landing in an append-only
    // table under a seven-year hold. `redact()` enforces the same rule on any
    // payload that reaches it; this is the call site being explicit about it.
    const { data: profile } = await supa
      .from('profiles')
      .select('email, full_name, phone')
      .maybeSingle();
    const [firstName, ...restName] = (profile?.full_name ?? '').trim().split(/\s+/);
    const contactSent = [
      profile?.email ? 'email' : null,
      profile?.phone ? 'phone' : null,
      firstName ? 'first_name' : null,
      restName.length > 0 ? 'last_name' : null,
    ].filter((v): v is string => v !== null);

    let checkoutUrl: string;
    let providerRef: string;

    try {
      if (body.provider === 'pesapal') {
        const r = await submitOrder({
          reference: paymentId,
          amount: Number(amount),
          currency,
          description: opened.description,
          email: profile?.email ?? undefined,
          phone: profile?.phone ?? undefined,
          firstName: firstName || undefined,
          lastName: restName.join(' ') || undefined,
          callbackUrl: opened.callbackUrl ?? undefined,
        });
        checkoutUrl = r.redirectUrl;
        providerRef = r.orderTrackingId;
      } else {
        const r = await createOrder({
          reference: paymentId,
          amount: Number(amount),
          currency,
          description: opened.description,
        });
        checkoutUrl = r.approveUrl;
        providerRef = r.id;
      }
    } catch (e) {
      // The PSP never opened a checkout, so no money can arrive against this
      // payment. Fail it now rather than leaving a pending row for the
      // reconciliation sweep to puzzle over an hour later.
      // Redacted before it goes anywhere: a provider SDK error frequently
      // quotes the request that failed, headers included.
      const message = redactMessage(e instanceof Error ? e.message : 'psp_error');
      await admin.rpc('record_payment_result', {
        p_payment_id: paymentId,
        p_status: 'failed',
        p_provider_ref: null,
        p_reason: message,
        p_context: ctx,
      });
      await writeAudit(admin, ctx, {
        action: 'checkout_refused',
        entityType: 'payments',
        entityId: paymentId,
        detail: {
          reason: 'provider_rejected_order',
          detail: message,
          provider: body.provider,
          method: body.method,
          amount,
          currency,
          purpose,
          contactSent,
        },
      });
      throw new HttpError(502, message);
    }

    // Persist the provider reference and the checkout page immediately.
    // Without the reference, reconciliation has no handle to re-query a
    // payment whose webhook never arrives; without the page, a replay has
    // nothing to hand back. Both are written in one statement.
    //
    // A failure here is filed as critical and the payer still gets their
    // checkout: the PSP order exists, and Pesapal's IPN carries both ids, so
    // the webhook path can still settle it.
    const { data: attached, error: attachError } = await admin.rpc('attach_payment_provider_ref', {
      p_payment_id: paymentId,
      p_provider_ref: providerRef,
      p_checkout_url: checkoutUrl,
      p_context: ctx,
    });

    if (attachError || attached !== true) {
      const detail = redactMessage(attachError?.message ?? 'no_row_updated');
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'attach_provider_ref_failed',
          paymentId,
          providerRef,
          detail,
        }),
      );
      const { error: raiseError } = await admin.rpc('raise_reconciliation_exception', {
        p_kind: 'orphan_payment',
        p_dedupe_key: `payment:${paymentId}:provider_ref_unattached`,
        p_detail: `Checkout was created at the provider but its reference could not be stored on the payment: ${detail}`,
        p_metadata: {
          providerRef,
          checkoutUrl,
          provider: body.provider,
          purpose,
          subscriptionId,
          error: detail,
        },
        p_expected: Number(amount),
        p_actual: null,
        p_escrow_id: escrowId,
        p_payment_id: paymentId,
        p_payout_id: null,
        p_severity: 'critical',
        p_context: ctx,
      });
      if (raiseError) {
        console.error(
          JSON.stringify({
            level: 'error',
            message: 'raise_exception_failed',
            paymentId,
            detail: redactMessage(raiseError.message),
          }),
        );
      }

      await writeAudit(admin, ctx, {
        action: 'provider_ref_unattached',
        entityType: 'payments',
        entityId: paymentId,
        detail: { reason: detail, provider: body.provider, providerRef, purpose },
      });
    }

    await writePaymentLog(admin, ctx, {
      paymentId,
      provider: body.provider,
      direction: 'request',
      eventType: 'checkout_created',
      httpStatus: 200,
      payload: { providerRef, checkoutUrl, amount, currency, idempotencyKey, purpose },
    });

    await writeAudit(admin, ctx, {
      action: 'checkout_created',
      entityType: 'payments',
      entityId: paymentId,
      detail: {
        purpose,
        provider: body.provider,
        method: body.method,
        amount,
        currency,
        providerRef,
        escrowId,
        subscriptionId,
        // Names only. See the note where `contactSent` is built.
        contactSent,
      },
    });

    return json(req, {
      purpose,
      paymentId,
      escrowId,
      subscriptionId,
      checkoutUrl,
      amount,
      currency,
      correlationId: opened.correlationId,
      replayed: false,
    });
  }),
);

// ---------------------------------------------------------------------
// The two purposes. Each returns the same shape so the PSP half above is
// written once.
// ---------------------------------------------------------------------

async function openEscrow(
  supa: ReturnType<typeof userClient>,
  body: EscrowBody,
  idempotencyKey: string | null,
  ctx: PaymentContext,
): Promise<Opened> {
  const { data, error } = await supa
    .rpc('activate_escrow', {
      p_booking_id: body.bookingId,
      p_provider: body.provider,
      p_method: body.method,
      p_idempotency_key: idempotencyKey,
      p_context: ctx,
    })
    .maybeSingle();

  if (error) throw new HttpError(mapRpcStatus(error.message), error.message);
  if (!data) throw new HttpError(400, 'escrow_activation_failed');
  const a = data as EscrowActivation;

  return {
    purpose: 'escrow_funding',
    paymentId: a.payment_id,
    amount: a.amount,
    currency: a.currency,
    providerRef: a.provider_ref,
    checkoutUrl: a.checkout_url,
    description: 'Sinnapi escrow payment',
    callbackUrl: null,
    escrowId: a.escrow_id,
    subscriptionId: null,
    correlationId: a.correlation_id,
  };
}

async function openSubscription(
  supa: ReturnType<typeof userClient>,
  body: SubscriptionBody,
  idempotencyKey: string | null,
  ctx: PaymentContext,
): Promise<Opened> {
  const { data, error } = await supa
    .rpc('activate_subscription_payment', {
      p_vendor_id: body.vendorId,
      p_plan_id: body.planId,
      p_provider: body.provider,
      p_method: body.method,
      p_idempotency_key: idempotencyKey,
      p_context: ctx,
    })
    .maybeSingle();

  if (error) throw new HttpError(mapRpcStatus(error.message), error.message);
  if (!data) throw new HttpError(400, 'subscription_activation_failed');
  const a = data as SubscriptionActivation;

  return {
    purpose: 'subscription',
    paymentId: a.payment_id,
    amount: a.amount,
    currency: a.currency,
    providerRef: a.provider_ref,
    checkoutUrl: a.checkout_url,
    // The plan name, not "escrow": this is what the PSP's page and the
    // vendor's statement will say.
    description: `Sinnapi ${a.plan_name} plan (${a.billing_cycle})`,
    callbackUrl: vendorReturnUrl(),
    escrowId: null,
    subscriptionId: a.subscription_id,
    correlationId: a.correlation_id,
  };
}

/**
 * The vendor portal's return route, or null to fall back to the default
 * callback. VENDOR_PORTAL_URL is the same value the notification dispatcher
 * deep-links with, so the two cannot disagree about where the vendor portal
 * lives.
 */
function vendorReturnUrl(): string | null {
  const root = (Deno.env.get('VENDOR_PORTAL_URL') ?? '').trim().replace(/\/$/, '');
  return root ? `${root}/payments/return` : null;
}

// ---------------------------------------------------------------------
// Input.
// ---------------------------------------------------------------------

/**
 * Exactly one purpose, fully specified. A body carrying both a booking and a
 * plan is refused rather than resolved by precedence: whichever we picked,
 * the caller believed they were paying for the other.
 */
function readBody(raw: Record<string, unknown>): EscrowBody | SubscriptionBody {
  const provider = raw.provider as string | undefined;
  const method = raw.method as string | undefined;
  if (!provider || !PROVIDERS.has(provider)) throw new HttpError(422, 'invalid_provider');
  if (!method || !METHODS.has(method)) throw new HttpError(422, 'invalid_method');
  if (provider === 'paypal' && method !== 'card') throw new HttpError(422, 'paypal_requires_card');

  const bookingId = typeof raw.bookingId === 'string' ? raw.bookingId.trim() : '';
  const planId = typeof raw.planId === 'string' ? raw.planId.trim() : '';
  const vendorId = typeof raw.vendorId === 'string' ? raw.vendorId.trim() : '';

  if (bookingId && planId) throw new HttpError(422, 'ambiguous_purpose');

  if (bookingId) {
    if (!UUID.test(bookingId)) throw new HttpError(422, 'invalid_booking_id');
    return { bookingId, provider: provider as Provider, method: method as Method };
  }

  if (planId) {
    if (!UUID.test(planId)) throw new HttpError(422, 'invalid_plan_id');
    if (!vendorId) throw new HttpError(422, 'vendor_id_required');
    if (!UUID.test(vendorId)) throw new HttpError(422, 'invalid_vendor_id');
    return { planId, vendorId, provider: provider as Provider, method: method as Method };
  }

  throw new HttpError(422, 'booking_id_or_plan_id_required');
}

/**
 * The caller's idempotency key, or null when none was sent.
 *
 * A malformed key is refused rather than ignored: silently dropping it would
 * turn a client that believes it is protected against a double charge into
 * one that is not, with nothing in the response to say so.
 */
function readIdempotencyKey(req: Request): string | null {
  const raw = req.headers.get('idempotency-key');
  if (raw === null) return null;
  const key = raw.trim();
  if (key === '') return null;
  if (!IDEMPOTENCY_KEY.test(key)) throw new HttpError(422, 'invalid_idempotency_key');
  return key;
}

/** Map the RPCs' domain errors onto meaningful HTTP statuses for the UI. */
function mapRpcStatus(message: string): number {
  if (message.includes('forbidden')) return 403;
  if (message.includes('not_found')) return 404;
  if (message.includes('escrow_already_active') || message.includes('payment_already_in_flight')) {
    return 409;
  }
  if (
    message.includes('booking_not_confirmed') ||
    message.includes('not_an_escrow_booking') ||
    message.includes('payment_terms_not_agreed') ||
    message.includes('advance_terms_not_accepted') ||
    message.includes('booking_amount_not_set') ||
    message.includes('paypal_requires_card') ||
    message.includes('partial_payment_not_allowed') ||
    message.includes('plan_inactive') ||
    message.includes('plan_is_free') ||
    message.includes('vendor_not_active')
  ) {
    return 422;
  }
  return 400;
}
