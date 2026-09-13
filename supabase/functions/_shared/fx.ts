// Fetching a foreign-exchange rate, in one place.
//
// WHY THIS IS SHARED
// Two callers need a rate: `fx-rate-sync` on a cron, and `fx-quote` when the
// newest stored rate is too old to price a checkout with. They were building
// the request separately, which is how one of them can rot without the other
// noticing — and did.
//
// WHAT WENT WRONG BEFORE
// The original default was `api.exchangerate.host/latest?base=…&symbols=…`,
// which was free and keyless when it was chosen and has since moved behind an
// API key. Every request now answers `{"success":false,"error":{"code":101,
// "type":"missing_access_key"}}` with HTTP 200. `fx-rate-sync` read
// `body.rates[quote]`, found nothing, and `continue`d — so it reported success
// on every run while inserting no rows, for as long as that has been true.
// Nothing surfaced until a PayPal checkout needed a rate and found the table
// empty. A rate source failing is expected; failing silently is the bug, so
// `readRate` distinguishes "the provider said no" from "there was no rate"
// and both callers now say so out loud.
//
// SWAPPING PROVIDERS
// `FX_API_URL` may carry `{base}` and `{quote}` placeholders, because the
// endpoints differ in shape: some take the base currency in the path, others
// as a query parameter. With no placeholder the base and quote are appended as
// `?base=&symbols=`, which is what the query-style providers expect. So a
// keyed provider is a config change and not a code change:
//
//   https://api.exchangerate.host/latest?base={base}&symbols={quote}&access_key=…
//
// The default is keyless on purpose: a payment rail that stops working the day
// a free tier changes its terms is not a rail anyone should have to think
// about at 2am.

/** Keyless, covers UGX, and returns `rates` at the top level. */
const DEFAULT_FX_URL = 'https://open.er-api.com/v6/latest/{base}';

/** The provider sits in front of a payer waiting on a total. */
const TIMEOUT_MS = 5000;

export type FxFetch = { ok: true; rate: number } | { ok: false; reason: string };

/** The endpoint for one pair, honouring `{base}`/`{quote}` placeholders. */
export function fxRateUrl(base: string, quote: string): string {
  const template = Deno.env.get('FX_API_URL')?.trim() || DEFAULT_FX_URL;

  if (template.includes('{base}') || template.includes('{quote}')) {
    return template
      .replaceAll('{base}', encodeURIComponent(base))
      .replaceAll('{quote}', encodeURIComponent(quote));
  }

  // A bare endpoint: the query-parameter convention the older providers use.
  const join = template.includes('?') ? '&' : '?';
  return `${template}${join}base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(quote)}`;
}

/**
 * One rate, or a reason there isn't one.
 *
 * Never throws: both callers have their own fallback and neither should have
 * to distinguish a network error from a bad payload to use it. The reason is
 * for the log, and it is specific enough to tell an outage from a provider
 * that has quietly started refusing us.
 */
export async function fetchFxRate(base: string, quote: string): Promise<FxFetch> {
  const url = fxRateUrl(base, quote);

  let body: unknown;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    body = await res.json();
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'fetch_failed' };
  }

  return readRate(body, quote);
}

/**
 * The quoted rate out of a provider's payload.
 *
 * Providers disagree about where the rates live and agree about very little
 * else, so this reads the two shapes in use and — importantly — surfaces an
 * explicit error object when one is present. That last part is what the
 * previous code was missing: a refusal and an empty answer are not the same
 * event, and treating them alike is what let a dead credential look like a
 * quiet day.
 */
export function readRate(body: unknown, quote: string): FxFetch {
  const b = (body ?? {}) as Record<string, unknown>;

  // An explicit refusal, whatever the HTTP status said.
  const err = b.error as { type?: string; info?: string; code?: number } | undefined;
  if (err && (err.type || err.info || err.code != null)) {
    return { ok: false, reason: `provider_error:${err.type ?? err.code ?? 'unknown'}` };
  }
  if (b.success === false || b.result === 'error') {
    return { ok: false, reason: 'provider_refused' };
  }

  const rates = (b.rates ?? b.conversion_rates) as Record<string, unknown> | undefined;
  const raw = rates?.[quote] ?? rates?.[quote.toLowerCase()];
  const rate = Number(raw);

  if (!Number.isFinite(rate) || rate <= 0) return { ok: false, reason: 'rate_missing' };
  return { ok: true, rate };
}
