// fx-rate-sync — cron + on-demand. Fetches UGX/USD rates from a trusted FX API
// and stores them; transactions snapshot the rate id at funding time.
//
// A FAILED RUN NOW SAYS SO.
// This used to `continue` past any pair it could not read, then answer
// `{ ok: true }` regardless. When the configured provider moved behind an API
// key it began refusing every request with an HTTP 200 and an error body, so
// this function reported success on every run while inserting nothing, for as
// long as that was true. Nothing noticed until a PayPal checkout needed a rate
// and found the table empty.
//
// So: each pair reports its own outcome, and a run that stored no rates at all
// answers 502. A cron that fails is visible in a way a cron that lies is not.
// Partial success is still 200 — one leg of a pair going missing is worth
// recording but not worth failing a run over, since either direction is enough
// to price with.
import { handler, json } from '../_shared/http.ts';
import { adminClient, isServiceRoleCaller, HttpError } from '../_shared/supabase.ts';
import { fetchFxRate } from '../_shared/fx.ts';

const PAIRS: Array<[string, string]> = [
  ['USD', 'UGX'],
  ['UGX', 'USD'],
];

Deno.serve(
  handler(async (req) => {
    // Cron-only. The gateway does not verify a JWT here. Every rate this writes
    // is read back by escrow pricing, so an open endpoint would let anyone burn
    // the FX API quota at will, and at worst pin a rate they chose. pg_cron
    // presents the service-role key as its bearer.
    if (!isServiceRoleCaller(req)) throw new HttpError(401, 'unauthorized');

    const supa = adminClient();
    const inserted: Array<{ base: string; quote: string; rate: number }> = [];
    const failed: Array<{ base: string; quote: string; reason: string }> = [];

    for (const [base, quote] of PAIRS) {
      const fetched = await fetchFxRate(base, quote);
      if (!fetched.ok) {
        failed.push({ base, quote, reason: fetched.reason });
        continue;
      }

      const { error } = await supa.from('exchange_rates').insert({
        base_currency: base,
        quote_currency: quote,
        rate: fetched.rate,
        source: 'fx-api',
        valid_from: new Date().toISOString(),
      });

      if (error) {
        failed.push({ base, quote, reason: `insert_failed:${error.message}` });
        continue;
      }
      inserted.push({ base, quote, rate: fetched.rate });
    }

    if (failed.length > 0) {
      console.error(
        JSON.stringify({ level: 'error', message: 'fx_rate_sync_incomplete', detail: { failed } }),
      );
    }

    // Nothing stored. Either the provider is refusing us or it has changed
    // shape; both need a person, and neither should look like a good run.
    if (inserted.length === 0) {
      throw new HttpError(502, 'fx_rate_sync_failed');
    }

    return json(req, { ok: true, inserted, failed });
  }),
);
