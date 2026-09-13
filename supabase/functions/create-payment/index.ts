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
import { budget, withDeadline, DeadlineError, type Budget } from '../_shared/deadline.ts';
import { portalReturnUrl, appendQueryParam } from '../_shared/publicUrl.ts';

type Provider = 'pesapal' | 'paypal';
type Method = 'mtn_momo' | 'airtel_money' | 'card';

/**
 * `fxQuoteId` is required on the PayPal rail and forbidden nowhere else: it
 * names the conversion the payer was shown and agreed to. See the FX block
 * further down for why the charge is re-derived from it rather than re-priced.
 */
type EscrowBody = {
  bookingId: string;
  provider: Provider;
  method: Method;
  fxQuoteId: string | null;
};
type SubscriptionBody = {
  planId: string;
  vendorId: string;
  provider: Provider;
  method: Method;
  fxQuoteId: string | null;
};

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

// ---------------------------------------------------------------------
// Time.
//
// This function used to have no deadline of any kind. It makes eight
// sequential round trips — two of them to a third party — and if any one of
// them stalled it stalled with it, until the Edge runtime killed the isolate
// at its wall-clock limit and the payer got `upstream request timeout` about
// two and a half minutes later. No reason, no retry advice, and a `payments`
// row left pending that held the one-checkout-at-a-time guard against the
// payer's next attempt, because the code never reached its own error handler.
//
// That is exactly what happened: PayPal stopped answering a create-order call
// carrying a `return_url` it could not reach, and the 12-second
// `AbortSignal.timeout` on it did not fire. See the header of deadline.ts for
// why an abort signal alone was never going to be enough.
//
// So there is now one budget for the whole request, divided between the steps.
// Two properties matter and neither is negotiable:
//
//   * it is SHORTER than the browser's own timeout, so the server is always
//     the one that names the failure. A generic client-side timeout tells the
//     payer nothing and tells support less.
//   * the cleanup reserve is held OUTSIDE it, so there is always time left to
//     fail the payment row and release the in-flight guard. A payer who has
//     just been refused must be able to try again immediately, not in half an
//     hour when the checkout TTL lapses.
// ---------------------------------------------------------------------

/** The whole request, from first round trip to the response. */
const REQUEST_BUDGET_MS = 20_000;

/** Held back for failing the payment and recording why. Never lent out. */
const CLEANUP_BUDGET_MS = 5_000;

/** What each step may have, before the request budget clamps it. */
const STEP_MS = {
  /** Ownership, state, pricing, the in-flight guard, the replay. */
  activate: 7_000,
  /** One quote row and one payment row, both by primary key. */
  applyFx: 4_000,
  /** One row by primary key. */
  profile: 2_500,
  /** Token + create-order, together. The slowest hop by far. */
  provider: 9_000,
  /** One update by primary key. */
  attach: 3_000,
  /** Telemetry. Never allowed to delay a checkout it only describes. */
  audit: 2_000,
} as const;

Deno.serve(
  handler(async (req) => {
    const userId = await requireUser(req);
    const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const body = readBody(raw);
    const idempotencyKey = readIdempotencyKey(req);

    const supa = userClient(req);
    const admin = adminClient();
    const clock = budget(REQUEST_BUDGET_MS);

    // Where the provider sends the browser back to, resolved and validated
    // BEFORE anything else happens.
    //
    // The order matters and it is the whole point. PayPal requires
    // `return_url` and `cancel_url` to be publicly reachable HTTPS addresses,
    // and this project had them pointing at `http://localhost:3001` — so
    // PayPal simply never answered the create-order call. Checking the
    // addresses first means a misconfigured deployment is refused in
    // milliseconds, with no payment row created, no FX quote consumed, no
    // in-flight guard taken and nothing at the provider to reconcile.
    //
    // Pesapal is unaffected: it takes its callback as a parameter and accepts
    // what it is given, so a null here keeps its existing default behaviour.
    let callbacks: { returnUrl: string; cancelUrl: string } | null = null;
    if (body.provider === 'paypal') {
      callbacks = resolvePaypalCallbacks('bookingId' in body ? 'escrow_funding' : 'subscription');
    }

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
          ? await openEscrow(supa, body, idempotencyKey, ctx, clock)
          : await openSubscription(supa, body, idempotencyKey, ctx, clock);
    } catch (e) {
      const reason = reasonFor(e);
      await audit(clock, admin, ctx, {
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
      // No payment row exists to fail — the activation is what did not land —
      // so there is nothing here to clean up, only something to report. A
      // deadline becomes a 504 so the portals offer a retry; an HttpError the
      // RPC already classified keeps the status it was given.
      if (e instanceof DeadlineError) throw new HttpError(504, reason);
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
        await audit(clock, admin, ctx, {
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
      await audit(clock, admin, ctx, {
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

    // ---------------------------------------------------------------
    // Currency conversion, for the one rail that cannot take shillings.
    //
    // The payment row was created in UGX like every other. PayPal's Orders
    // API accepts 24 currencies and UGX is not among them, so the row is
    // re-denominated into the USD the payer was quoted: `amount`/`currency`
    // become the charge, the shillings drop into `base_amount`/`base_currency`
    // and the rate is recorded against the row.
    //
    // The figure comes from the locked `fx_quotes` row, NOT from re-pricing.
    // The payer saw a total, left for PayPal's hosted page, and may take
    // several minutes to finish; re-converting here would charge them
    // something other than what they agreed to, which is the single most
    // common complaint in cross-currency checkout. If the lock has lapsed the
    // charge is refused and the payer re-confirms against a fresh quote —
    // never charged silently at a rate they never saw.
    //
    // Escrow is untouched by any of this. `escrow_transactions.gross_amount`
    // stays in shillings and `fund_escrow` posts the ledger from there, so
    // commission, the held pool and the vendor's payout are all unaffected.
    // ---------------------------------------------------------------
    let chargeAmount = Number(amount);
    let chargeCurrency = currency;
    let baseAmount: number | null = null;
    let baseCurrency: string | null = null;

    if (body.provider === 'paypal' && body.fxQuoteId) {
      const fx = await settle(() =>
        withDeadline('apply_payment_fx', clock.allow(STEP_MS.applyFx), (signal) =>
          admin
            .rpc('apply_payment_fx', {
              p_payment_id: paymentId,
              p_fx_quote_id: body.fxQuoteId,
              p_context: ctx,
            })
            .abortSignal(signal)
            .maybeSingle(),
        ),
      );

      if (!fx.ok || fx.value.error || !fx.value.data) {
        // The payment exists and is pending, and nothing can ever arrive
        // against it — no PSP order was opened. Fail it now so the
        // one-checkout-at-a-time guard releases and the payer can re-confirm
        // immediately, rather than being told a checkout is in flight for the
        // next hour by a row the reconciliation sweep has yet to reach.
        const reason = fx.ok
          ? redactMessage(fx.value.error?.message ?? 'fx_quote_not_applied')
          : reasonFor(fx.error);
        await failCheckout(admin, ctx, paymentId, reason, {
          purpose,
          provider: body.provider,
          method: body.method,
          fxQuoteId: body.fxQuoteId,
        });
        throw new HttpError(mapRpcStatus(reason), reason);
      }
      const converted = fx.value.data as {
        amount: number;
        currency: string;
        base_amount: number;
        base_currency: string;
      };
      chargeAmount = Number(converted.amount);
      chargeCurrency = converted.currency;
      baseAmount = Number(converted.base_amount);
      baseCurrency = converted.base_currency;

      // On the record, because it changes what leaves the payer's account.
      await audit(clock, admin, ctx, {
        action: 'payment_converted',
        entityType: 'payments',
        entityId: paymentId,
        detail: {
          purpose,
          fxQuoteId: body.fxQuoteId,
          charged: chargeAmount,
          chargedCurrency: chargeCurrency,
          owed: baseAmount,
          owedCurrency: baseCurrency,
        },
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
    // Filtered by id, which it previously was not. An unfiltered
    // `.select().maybeSingle()` leaned entirely on RLS returning exactly one
    // row: the moment a policy lets a client see any second profile — a
    // vendor's public one, a support role — PostgREST answers 406 for "more
    // than one row", the error is discarded here, and the payer's contact
    // silently stops being forwarded. Asking for the row we actually want is
    // both correct and an index lookup instead of a policy-filtered scan.
    //
    // A failure is tolerated rather than fatal: the contact only pre-fills the
    // provider's own form and cannot affect what is charged, so a slow
    // `profiles` read must not cost the payer their checkout.
    const profileRead = await settle(() =>
      withDeadline('read_profile', clock.allow(STEP_MS.profile), (signal) =>
        supa
          .from('profiles')
          .select('email, full_name, phone')
          .eq('id', userId)
          .abortSignal(signal)
          .maybeSingle(),
      ),
    );
    if (!profileRead.ok || profileRead.value.error) {
      console.error(
        JSON.stringify({
          level: 'warn',
          message: 'billing_contact_unavailable',
          detail: profileRead.ok
            ? redactMessage(profileRead.value.error?.message ?? 'unknown')
            : reasonFor(profileRead.error),
        }),
      );
    }
    const profile = profileRead.ok ? profileRead.value.data : null;
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
          amount: chargeAmount,
          currency: chargeCurrency,
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
        // `callbacks` is non-null on this branch: it is resolved and validated
        // at the top of the handler for the PayPal rail, before any row was
        // written. The assertion documents that rather than re-deriving it.
        //
        // Embed our payment id as `pid` on both addresses: PayPal preserves
        // the return URL's existing query string and appends its own (`token`,
        // `PayerID`), so the frontend can read `pid` to find the payment row
        // — the same job `OrderMerchantReference` does on the Pesapal path.
        const r = await createOrder({
          reference: paymentId,
          amount: chargeAmount,
          currency: chargeCurrency,
          description: opened.description,
          returnUrl: appendQueryParam(callbacks!.returnUrl, 'pid', paymentId),
          cancelUrl: appendQueryParam(callbacks!.cancelUrl, 'pid', paymentId),
          timeoutMs: clock.allow(STEP_MS.provider),
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
      const message = reasonFor(e);
      await failCheckout(admin, ctx, paymentId, message, {
        reason: 'provider_rejected_order',
        detail: message,
        provider: body.provider,
        method: body.method,
        amount: chargeAmount,
        currency: chargeCurrency,
        purpose,
        contactSent,
      });
      // A deadline is not the provider refusing us — it is us giving up on a
      // provider that went quiet — and the two want different advice. 504 is
      // what the portals key "nothing was charged, try again" off; 502 stays
      // "the provider said no", which a retry will usually repeat.
      throw new HttpError(e instanceof DeadlineError ? 504 : 502, message);
    }

    // Persist the provider reference and the checkout page immediately.
    // Without the reference, reconciliation has no handle to re-query a
    // payment whose webhook never arrives; without the page, a replay has
    // nothing to hand back. Both are written in one statement.
    //
    // A failure here is filed as critical and the payer still gets their
    // checkout: the PSP order exists, and Pesapal's IPN carries both ids, so
    // the webhook path can still settle it.
    //
    // Everything from here on uses a FIXED allowance rather than what is left
    // of the request budget. The order exists at the provider and its checkout
    // URL is in hand: the payer must get it. Running out of budget at this
    // point may cost us a bookkeeping write — which is recoverable, and which
    // the reconciliation sweep exists for — but it must never cost the payer a
    // checkout that has already been created in their name.
    const attach = await settle(() =>
      withDeadline('attach_provider_ref', STEP_MS.attach, (signal) =>
        admin
          .rpc('attach_payment_provider_ref', {
            p_payment_id: paymentId,
            p_provider_ref: providerRef,
            p_checkout_url: checkoutUrl,
            p_context: ctx,
          })
          .abortSignal(signal),
      ),
    );
    const attachError = attach.ok ? attach.value.error : null;
    const attached = attach.ok ? attach.value.data : null;

    if (!attach.ok || attachError || attached !== true) {
      const detail = attach.ok
        ? redactMessage(attachError?.message ?? 'no_row_updated')
        : reasonFor(attach.error);
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'attach_provider_ref_failed',
          paymentId,
          providerRef,
          detail,
        }),
      );
      const raise = await settle(() =>
        withDeadline('raise_exception', STEP_MS.attach, (signal) =>
          admin
            .rpc('raise_reconciliation_exception', {
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
            })
            .abortSignal(signal),
        ),
      );
      const raiseError = raise.ok ? raise.value.error : null;
      if (!raise.ok || raiseError) {
        console.error(
          JSON.stringify({
            level: 'error',
            message: 'raise_exception_failed',
            paymentId,
            detail: raise.ok ? redactMessage(raiseError!.message) : reasonFor(raise.error),
          }),
        );
      }

      await audit(null, admin, ctx, {
        action: 'provider_ref_unattached',
        entityType: 'payments',
        entityId: paymentId,
        detail: { reason: detail, provider: body.provider, providerRef, purpose },
      });
    }

    await paymentLog(admin, ctx, {
      paymentId,
      provider: body.provider,
      direction: 'request',
      eventType: 'checkout_created',
      httpStatus: 200,
      payload: {
        providerRef,
        checkoutUrl,
        amount: chargeAmount,
        currency: chargeCurrency,
        baseAmount,
        baseCurrency,
        idempotencyKey,
        purpose,
      },
    });

    await audit(null, admin, ctx, {
      action: 'checkout_created',
      entityType: 'payments',
      entityId: paymentId,
      detail: {
        purpose,
        provider: body.provider,
        method: body.method,
        amount: chargeAmount,
        currency: chargeCurrency,
        baseAmount,
        baseCurrency,
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
      amount: chargeAmount,
      currency: chargeCurrency,
      // Null on every rail but PayPal. When set, `amount` is what the payer
      // is charged and this is what the booking actually owes.
      baseAmount,
      baseCurrency,
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
  clock: Budget,
): Promise<Opened> {
  const { data, error } = await withDeadline(
    'activate_escrow',
    clock.allow(STEP_MS.activate),
    (signal) =>
      supa
        .rpc('activate_escrow', {
          p_booking_id: body.bookingId,
          p_provider: body.provider,
          p_method: body.method,
          p_idempotency_key: idempotencyKey,
          p_context: ctx,
        })
        .abortSignal(signal)
        .maybeSingle(),
  );

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
  clock: Budget,
): Promise<Opened> {
  const { data, error } = await withDeadline(
    'activate_subscription_payment',
    clock.allow(STEP_MS.activate),
    (signal) =>
      supa
        .rpc('activate_subscription_payment', {
          p_vendor_id: body.vendorId,
          p_plan_id: body.planId,
          p_provider: body.provider,
          p_method: body.method,
          p_idempotency_key: idempotencyKey,
          p_context: ctx,
        })
        .abortSignal(signal)
        .maybeSingle(),
  );

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

/**
 * Where PayPal should send the browser back to, for this purpose.
 *
 * PayPal, unlike Pesapal, takes the return address inside the create-order
 * body and REQUIRES it to be a publicly reachable HTTPS URL — it redirects a
 * real browser there once the payer approves. Get it wrong and the create-order
 * call does not fail cleanly; it goes quiet, and takes the function's whole
 * wall-clock budget with it. That is the bug this function exists to make
 * impossible, so it throws a 500 naming the offending variable and the reason
 * rather than letting a bad value reach the provider.
 *
 * 500, not 4xx: nothing the payer did is wrong and nothing they can do will
 * help. It is this deployment's configuration, and it should read that way in
 * the logs.
 *
 * Derived per purpose, because there are two portals on two origins and each
 * has its own `/payments/return` route: a vendor paying for a plan must land
 * back in the vendor portal, a client funding escrow in the client portal.
 * `vendorReturnUrl()` above already makes exactly this distinction for
 * Pesapal's callback — PayPal had been ignoring it and sending everyone to a
 * single global address. PAYPAL_RETURN_URL / PAYPAL_CANCEL_URL still win when
 * set, for a return that has to go somewhere that is not a portal route.
 */
function resolvePaypalCallbacks(purpose: 'escrow_funding' | 'subscription'): {
  returnUrl: string;
  cancelUrl: string;
} {
  const portalVar = purpose === 'subscription' ? 'VENDOR_PORTAL_URL' : 'CLIENT_PORTAL_URL';
  const origin = Deno.env.get(portalVar);

  const ret = portalReturnUrl(origin, '/payments/return', Deno.env.get('PAYPAL_RETURN_URL'));
  if (!ret.ok) {
    throw new HttpError(
      500,
      `paypal_return_url_invalid: ${ret.reason} (set PAYPAL_RETURN_URL, or ${portalVar}, to a public https address)`,
    );
  }

  // A cancel that lands on the return route is indistinguishable from a
  // completed payment, and this project had both variables set to the same
  // value. `?cancelled=1` is what lets the return page tell "they backed out"
  // from "they paid and we are waiting on the webhook" — two different things
  // to say to someone, and one of them must not imply money moved.
  const cancelOverride = Deno.env.get('PAYPAL_CANCEL_URL');
  const cancel = cancelOverride?.trim()
    ? portalReturnUrl(origin, '/payments/return', cancelOverride)
    : portalReturnUrl(origin, '/payments/return?cancelled=1');
  if (!cancel.ok) {
    throw new HttpError(
      500,
      `paypal_cancel_url_invalid: ${cancel.reason} (set PAYPAL_CANCEL_URL, or ${portalVar}, to a public https address)`,
    );
  }

  return { returnUrl: ret.url, cancelUrl: cancel.url };
}

// ---------------------------------------------------------------------
// Bounded plumbing.
//
// Every call below used to be a bare `await`. One of them going quiet was
// enough to lose the whole request, so each now carries a deadline — and the
// ones that only DESCRIBE a checkout can never delay the checkout itself.
// ---------------------------------------------------------------------

/** A result that captures the throw instead of propagating it. */
type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown };

/**
 * Run something and hand back whether it threw, rather than throwing.
 *
 * Used because a deadline has to be handled differently at every call site
 * here — some are fatal, some are recoverable, some are pure telemetry — and
 * `try`/`catch` around each one buried the actual logic. This keeps the
 * decision at the call site and the mechanics out of it.
 */
async function settle<T>(run: () => Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    return { ok: false, error };
  }
}

/** One redacted line for a payment's `failure_reason` and the log. */
function reasonFor(e: unknown): string {
  if (e instanceof DeadlineError) return `timed_out: ${e.label}`;
  return redactMessage(e instanceof Error ? e.message : 'unknown_error');
}

/**
 * Fail a payment nothing can ever arrive against, and record why.
 *
 * Runs on the cleanup reserve, which is held OUTSIDE the request budget for
 * exactly this: by the time we get here the budget may be gone, and this is
 * the work that must still happen. Leaving the row pending is the expensive
 * mistake — it holds the one-checkout-at-a-time guard, so the payer is told a
 * checkout is already in flight until the TTL lapses, for a checkout that was
 * never opened at the provider at all.
 *
 * Never throws. The caller is already on its way to reporting a failure and a
 * second one raised from the cleanup would replace a specific reason with a
 * generic one.
 */
async function failCheckout(
  admin: ReturnType<typeof adminClient>,
  ctx: PaymentContext,
  paymentId: string,
  reason: string,
  detail: Record<string, unknown>,
): Promise<void> {
  const failed = await settle(() =>
    withDeadline('record_payment_result', CLEANUP_BUDGET_MS, (signal) =>
      admin
        .rpc('record_payment_result', {
          p_payment_id: paymentId,
          p_status: 'failed',
          p_provider_ref: null,
          p_reason: reason,
          p_context: ctx,
        })
        .abortSignal(signal),
    ),
  );

  const error = failed.ok ? failed.value.error : null;
  if (!failed.ok || error) {
    // Loud, because the consequence is a stuck guard on a real payer's
    // booking. The reconciliation sweep will clear it, but not for an hour.
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'fail_payment_failed',
        paymentId,
        detail: failed.ok ? redactMessage(error!.message) : reasonFor(failed.error),
      }),
    );
  }

  await audit(null, admin, ctx, {
    action: 'checkout_refused',
    entityType: 'payments',
    entityId: paymentId,
    detail: { reason, ...detail },
  });
}

/**
 * An audit row, bounded and never fatal.
 *
 * `writeAudit` already swallows its own failures; what it could not do is stop
 * WAITING. A `audit_logs` insert that blocked took the checkout with it, which
 * inverts the rule the audit helper's own header sets out — telemetry hanging
 * off the side of a payment must not become the reason the payment fails.
 *
 * Pass `clock` while the outcome is still undecided, so the write is clamped
 * by the request budget. Pass `null` once the checkout exists and only the
 * bookkeeping is left: then it gets its own fixed allowance, because by that
 * point the budget may be spent and the row is still worth trying for.
 */
async function audit(
  clock: Budget | null,
  admin: ReturnType<typeof adminClient>,
  ctx: PaymentContext,
  entry: Parameters<typeof writeAudit>[2],
): Promise<void> {
  const ms = clock ? clock.allow(STEP_MS.audit) : STEP_MS.audit;
  if (ms <= 0) return; // Budget gone. The response matters more than the row.

  const r = await settle(() =>
    withDeadline('write_audit', ms, () => writeAudit(admin, ctx, entry)),
  );
  if (!r.ok) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'audit_write_timed_out',
        action: entry.action,
        detail: reasonFor(r.error),
      }),
    );
  }
}

/** The raw-traffic row, under the same rule as `audit` above. */
async function paymentLog(
  admin: ReturnType<typeof adminClient>,
  ctx: PaymentContext,
  entry: Parameters<typeof writePaymentLog>[2],
): Promise<void> {
  const r = await settle(() =>
    withDeadline('write_payment_log', STEP_MS.audit, () => writePaymentLog(admin, ctx, entry)),
  );
  if (!r.ok) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'payment_log_timed_out',
        eventType: entry.eventType,
        detail: reasonFor(r.error),
      }),
    );
  }
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

  // PayPal cannot accept UGX, so a PayPal checkout is only ever opened
  // against a conversion the payer has already been shown. No quote, no
  // charge — a PayPal order created from an unquoted amount would either be
  // rejected by PayPal or, worse, charge a figure nobody disclosed.
  const fxQuoteId = typeof raw.fxQuoteId === 'string' ? raw.fxQuoteId.trim() : '';
  if (provider === 'paypal') {
    if (!fxQuoteId) throw new HttpError(422, 'fx_quote_required');
    if (!UUID.test(fxQuoteId)) throw new HttpError(422, 'invalid_fx_quote_id');
  }

  const bookingId = typeof raw.bookingId === 'string' ? raw.bookingId.trim() : '';
  const planId = typeof raw.planId === 'string' ? raw.planId.trim() : '';
  const vendorId = typeof raw.vendorId === 'string' ? raw.vendorId.trim() : '';

  if (bookingId && planId) throw new HttpError(422, 'ambiguous_purpose');

  if (bookingId) {
    if (!UUID.test(bookingId)) throw new HttpError(422, 'invalid_booking_id');
    return {
      bookingId,
      provider: provider as Provider,
      method: method as Method,
      fxQuoteId: fxQuoteId || null,
    };
  }

  if (planId) {
    if (!UUID.test(planId)) throw new HttpError(422, 'invalid_plan_id');
    if (!vendorId) throw new HttpError(422, 'vendor_id_required');
    if (!UUID.test(vendorId)) throw new HttpError(422, 'invalid_vendor_id');
    return {
      planId,
      vendorId,
      provider: provider as Provider,
      method: method as Method,
      fxQuoteId: fxQuoteId || null,
    };
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
  // We gave up waiting on this call, or the database gave up waiting on a
  // lock. Neither is the payer's fault and both are safe to retry — the
  // portals treat 5xx as "try again", not "you did something wrong".
  if (message.startsWith('timed_out:')) return 504;
  if (message.includes('lock timeout') || message.includes('statement timeout')) return 503;
  // A misconfigured deployment, not a bad request. Named so it cannot be
  // mistaken for something the payer can fix by trying a different rail.
  if (message.includes('paypal_return_url_invalid')) return 500;
  if (message.includes('paypal_cancel_url_invalid')) return 500;
  if (message.includes('paypal_callback_url_invalid')) return 500;
  if (message.includes('forbidden')) return 403;
  if (message.includes('not_found')) return 404;
  if (message.includes('escrow_already_active') || message.includes('payment_already_in_flight')) {
    return 409;
  }
  // A lapsed or spent conversion is not a bad request — the payer did nothing
  // wrong and the fix is to re-confirm against a fresh quote. 409 is what the
  // portals key that retry off.
  if (message.includes('fx_quote_expired') || message.includes('fx_quote_already_used')) {
    return 409;
  }
  if (message.includes('fx_quote_not_yours')) return 403;
  if (
    message.includes('fx_quote_amount_mismatch') ||
    message.includes('fx_quote_currency_mismatch') ||
    message.includes('fx_quote_required') ||
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
