// fx-quote — user-invoked. Prices a PayPal checkout in USD and records what
// the payer was shown before they agreed to it.
//
// WHY THIS IS A FUNCTION AND NOT PART OF THE PRICING RPC
// `escrow_price_booking` is where every other figure in the checkout comes
// from, and the conversion belongs beside them. It cannot live there: when the
// stored rate is stale this has to reach a third-party FX API, and a pricing
// RPC that makes outbound HTTP calls is a pricing RPC that hangs when someone
// else's service is slow. So the UGX side is still priced by the RPC, under
// the caller's own RLS, and only the conversion happens here.
//
// WHAT IT GUARANTEES THE PAYER
// The figure returned is the figure they will be charged. `create-payment`
// re-derives the charge from the `fx_quotes` row this writes rather than
// re-pricing, so a rate that moves while the payer is on PayPal's page cannot
// change what leaves their account. The lock is 15 minutes; past that the
// confirmation step re-quotes and shows the new total rather than silently
// charging an old one.
//
// STALENESS, AND WHY AN OUTAGE DOES NOT STOP A SALE
// `fx-rate-sync` writes rates on a cron, so the newest row is usually minutes
// or hours old. Under an hour it is used as-is. Older than that, this fetches
// a fresh one and stores it. If that fetch fails — the FX API is down, slow,
// or has changed shape — the newest stored rate is used instead and the quote
// is marked `rate_stale`, with its true age shown to the payer. A third-party
// outage should cost the platform a slightly worse rate, which the margin
// exists to absorb, not a lost booking. Only a project with no UGX/USD rate at
// all is refused, and that is a deployment fault rather than a payer's problem.
import { handler, json } from '../_shared/http.ts';
import { userClient, adminClient, requireUser, HttpError } from '../_shared/supabase.ts';
import { fetchFxRate } from '../_shared/fx.ts';

/** How old a stored rate may be before this reaches for a fresh one. */
const RATE_MAX_AGE_MS = 60 * 60_000;

/** How long the payer has to act on the figure they were shown. */
const LOCK_MS = 15 * 60_000;

/** The margin used when `fx_margin_rate` is missing or unreadable. */
const DEFAULT_MARGIN_RATE = 0.02;

/** The only conversion the platform does. Both sides are seeded currencies. */
const BASE_CURRENCY = 'UGX';
const QUOTE_CURRENCY = 'USD';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type EscrowBody = { bookingId: string; advanceRate: number | null };
type SubscriptionBody = { planId: string; vendorId: string };

type RateRow = { id: string; rate: number; fetched_at: string };

Deno.serve(
  handler(async (req) => {
    const userId = await requireUser(req);
    const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const body = readBody(raw);

    const supa = userClient(req);
    const admin = adminClient();

    // The obligation, in shillings, priced exactly the way the rest of the
    // checkout prices it — through the caller's own RLS, never from the body.
    const priced =
      'bookingId' in body ? await priceBooking(supa, body) : await pricePlan(supa, body);

    if (priced.currency !== BASE_CURRENCY) {
      // Nothing converts anything but UGX today. Refusing loudly is better
      // than quietly applying a UGX rate to some other currency.
      throw new HttpError(422, 'fx_unsupported_base_currency');
    }

    const { row: rateRow, stale } = await resolveRate(admin);
    const marginRate = await readMarginRate(admin);

    // The payer is charged the mid-market conversion plus a disclosed margin.
    // Rounded UP to the cent: the rounding is at most one cent and it falls on
    // the side of the obligation being covered rather than short.
    const midQuote = priced.amount * rateRow.rate;
    const quoteAmount = Math.ceil(midQuote * (1 + marginRate) * 100) / 100;

    if (!(quoteAmount > 0)) throw new HttpError(422, 'fx_amount_too_small');

    // Expressed in the base currency so it sits next to figures the payer
    // already understands, and derived from the charge actually made so the
    // disclosed lines add up to the disclosed total exactly.
    const marginAmount = Math.round((quoteAmount / rateRow.rate - priced.amount) * 100) / 100;

    const expiresAt = new Date(Date.now() + LOCK_MS).toISOString();

    const { data: quote, error } = await admin
      .from('fx_quotes')
      .insert({
        purpose: priced.purpose,
        requested_by: userId,
        booking_id: 'bookingId' in body ? body.bookingId : null,
        plan_id: 'planId' in body ? body.planId : null,
        vendor_id: 'vendorId' in body ? body.vendorId : null,
        base_amount: priced.amount,
        base_currency: BASE_CURRENCY,
        quote_amount: quoteAmount,
        quote_currency: QUOTE_CURRENCY,
        fx_rate_id: rateRow.id,
        rate: rateRow.rate,
        rate_fetched_at: rateRow.fetched_at,
        margin_rate: marginRate,
        margin_amount: Math.max(marginAmount, 0),
        rate_stale: stale,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (error || !quote) throw new HttpError(500, 'fx_quote_not_recorded');

    return json(req, {
      fxQuoteId: quote.id,

      // What is owed, and what will be charged.
      baseAmount: priced.amount,
      baseCurrency: BASE_CURRENCY,
      amount: quoteAmount,
      currency: QUOTE_CURRENCY,

      // The rate as a payer reads it: how many shillings to one dollar. The
      // mid-market figure and the one this charge actually works out at are
      // both given, because the difference between them IS the margin and
      // quoting only one of them would hide it.
      midRate: round2(1 / rateRow.rate),
      effectiveRate: round2(priced.amount / quoteAmount),
      marginRate,
      marginAmount: Math.max(marginAmount, 0),

      rateFetchedAt: rateRow.fetched_at,
      rateStale: stale,
      expiresAt,
    });
  }),
);

// ---------------------------------------------------------------------
// Pricing the obligation. Both paths go through the caller's own client so
// a payer can only ever quote something they are allowed to pay for.
// ---------------------------------------------------------------------

async function priceBooking(
  supa: ReturnType<typeof userClient>,
  body: EscrowBody,
): Promise<{ purpose: 'escrow_funding'; amount: number; currency: string }> {
  const { data, error } = await supa
    .rpc('escrow_price_booking', {
      p_booking_id: body.bookingId,
      // The rail is fixed: this endpoint exists only for the one provider
      // that cannot take shillings, and its fee differs from mobile money's.
      p_provider: 'paypal',
      p_method: 'card',
      p_advance_rate: body.advanceRate,
    })
    .maybeSingle();

  if (error) throw new HttpError(422, error.message);
  if (!data) throw new HttpError(404, 'booking_not_found');

  const q = data as { gross_amount: number; currency: string };
  return { purpose: 'escrow_funding', amount: Number(q.gross_amount), currency: q.currency };
}

async function pricePlan(
  supa: ReturnType<typeof userClient>,
  body: SubscriptionBody,
): Promise<{ purpose: 'subscription'; amount: number; currency: string }> {
  const { data, error } = await supa
    .from('pricing_plans')
    .select('price, currency, is_active')
    .eq('id', body.planId)
    .maybeSingle();

  if (error) throw new HttpError(422, error.message);
  if (!data) throw new HttpError(404, 'plan_not_found');
  if (data.is_active === false) throw new HttpError(422, 'plan_inactive');
  if (!(Number(data.price) > 0)) throw new HttpError(422, 'plan_is_free');

  return { purpose: 'subscription', amount: Number(data.price), currency: data.currency };
}

// ---------------------------------------------------------------------
// The rate.
// ---------------------------------------------------------------------

/**
 * The rate to price with, and whether it is older than we would like.
 *
 * Fresh enough → use it. Stale → try to replace it, and fall back to it if
 * that fails. Nothing stored at all and no fetch → refuse, because there is
 * no figure anyone could stand behind.
 */
async function resolveRate(
  admin: ReturnType<typeof adminClient>,
): Promise<{ row: RateRow; stale: boolean }> {
  const stored = await newestRate(admin);

  if (stored && Date.now() - Date.parse(stored.fetched_at) <= RATE_MAX_AGE_MS) {
    return { row: stored, stale: false };
  }

  const fetched = await fetchAndStoreRate(admin);
  if (fetched) return { row: fetched, stale: false };

  if (stored) {
    // The FX API is unreachable and this rate is past its window. Used
    // anyway, flagged, and its real age is shown to the payer — see the note
    // at the top about why an outage must not cost a booking.
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'fx_rate_stale_fallback',
        detail: { fetchedAt: stored.fetched_at },
      }),
    );
    return { row: stored, stale: true };
  }

  throw new HttpError(503, 'fx_rate_unavailable');
}

async function newestRate(admin: ReturnType<typeof adminClient>): Promise<RateRow | null> {
  const { data } = await admin
    .from('exchange_rates')
    .select('id, rate, fetched_at')
    .eq('base_currency', BASE_CURRENCY)
    .eq('quote_currency', QUOTE_CURRENCY)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data || !(Number(data.rate) > 0)) return null;
  return { id: data.id, rate: Number(data.rate), fetched_at: data.fetched_at };
}

/**
 * Fetch a fresh rate and store it, or null if the API could not be reached.
 *
 * The row is written the same way `fx-rate-sync` writes its own, so a rate
 * pulled on demand and a rate pulled by cron are the same kind of evidence.
 * Timed out rather than left to hang: this sits in front of a payer who is
 * waiting on a total.
 */
async function fetchAndStoreRate(admin: ReturnType<typeof adminClient>): Promise<RateRow | null> {
  const fetched = await fetchFxRate(BASE_CURRENCY, QUOTE_CURRENCY);
  if (!fetched.ok) {
    // Logged with the provider's own reason, so a credential that has expired
    // reads differently from a network blip. Both fall back; only one of them
    // is fixed by waiting.
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'fx_rate_fetch_failed',
        detail: { pair: `${BASE_CURRENCY}/${QUOTE_CURRENCY}`, reason: fetched.reason },
      }),
    );
    return null;
  }
  const rate = fetched.rate;

  const { data, error } = await admin
    .from('exchange_rates')
    .insert({
      base_currency: BASE_CURRENCY,
      quote_currency: QUOTE_CURRENCY,
      rate,
      source: 'fx-quote',
      valid_from: new Date().toISOString(),
    })
    .select('id, rate, fetched_at')
    .single();

  if (error || !data) return null;
  return { id: data.id, rate: Number(data.rate), fetched_at: data.fetched_at };
}

/** The disclosed margin. A missing or malformed setting means the default. */
async function readMarginRate(admin: ReturnType<typeof adminClient>): Promise<number> {
  const { data } = await admin
    .from('platform_settings')
    .select('value')
    .eq('key', 'fx_margin_rate')
    .maybeSingle();

  const parsed = Number(data?.value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 0.5) return DEFAULT_MARGIN_RATE;
  return parsed;
}

// ---------------------------------------------------------------------
// Input.
// ---------------------------------------------------------------------

function readBody(raw: Record<string, unknown>): EscrowBody | SubscriptionBody {
  const bookingId = typeof raw.bookingId === 'string' ? raw.bookingId.trim() : '';
  const planId = typeof raw.planId === 'string' ? raw.planId.trim() : '';
  const vendorId = typeof raw.vendorId === 'string' ? raw.vendorId.trim() : '';

  if (bookingId && planId) throw new HttpError(422, 'ambiguous_purpose');

  if (bookingId) {
    if (!UUID.test(bookingId)) throw new HttpError(422, 'invalid_booking_id');
    const rate = raw.advanceRate;
    const advanceRate =
      rate === null || rate === undefined
        ? null
        : Number.isFinite(Number(rate))
          ? Number(rate)
          : null;
    return { bookingId, advanceRate };
  }

  if (planId) {
    if (!UUID.test(planId)) throw new HttpError(422, 'invalid_plan_id');
    if (!vendorId) throw new HttpError(422, 'vendor_id_required');
    if (!UUID.test(vendorId)) throw new HttpError(422, 'invalid_vendor_id');
    return { planId, vendorId };
  }

  throw new HttpError(422, 'booking_id_or_plan_id_required');
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
