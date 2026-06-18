// fx-rate-sync — cron + on-demand. Fetches UGX/USD rates from a trusted FX API
// and stores them; transactions snapshot the rate id at funding time.
import { handler, json } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";

const FX_URL = Deno.env.get("FX_API_URL") ?? "https://api.exchangerate.host/latest";
const PAIRS: Array<[string, string]> = [["USD", "UGX"], ["UGX", "USD"]];

Deno.serve(handler(async (req) => {
  const supa = adminClient();
  const inserted: Array<{ base: string; quote: string; rate: number }> = [];

  for (const [base, quote] of PAIRS) {
    const res = await fetch(`${FX_URL}?base=${base}&symbols=${quote}`);
    const body = await res.json();
    const rate = body?.rates?.[quote];
    if (!rate) continue;
    await supa.from("exchange_rates").insert({
      base_currency: base, quote_currency: quote, rate, source: "fx-api", valid_from: new Date().toISOString(),
    });
    inserted.push({ base, quote, rate });
  }
  return json(req, { ok: true, inserted });
}));
