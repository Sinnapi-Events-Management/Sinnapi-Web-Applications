import { supabase } from './supabase';

/**
 * How long a checkout-shaped Edge Function call is allowed to sit before the
 * BROWSER gives up on it, rather than the payer.
 *
 * `fetch` has no default timeout, and neither does supabase-js: left alone, a
 * stuck function call waits for whatever the server does — which, for a
 * wall-clock-limited Edge Function, can be minutes — with the UI frozen the
 * entire time. Nothing about a payment is served by that wait being long.
 *
 * THIS MUST STAY ABOVE THE SERVER'S OWN BUDGET, which is `REQUEST_BUDGET_MS`
 * plus `CLEANUP_BUDGET_MS` in `create-payment` — 25 seconds today. The server
 * knows WHY a checkout failed and can say so: the rate expired, the provider
 * refused the card, the return address is misconfigured. This timeout knows
 * only that nothing came back. Setting it below the server's budget throws
 * that reason away and replaces it with a shrug, which is how the last round
 * of this bug was diagnosed as a network problem for as long as it was.
 *
 * So it is the backstop for a request that never arrives at all, not the
 * mechanism for bounding a slow one. The server does the bounding.
 */
export const EDGE_FUNCTION_TIMEOUT_MS = 30_000;

/**
 * Invoke an Edge Function and normalise its failure into a readable message.
 *
 * supabase-js resolves any non-2xx response to a FunctionsHttpError whose
 * `.message` is the unhelpful "Edge Function returned a non-2xx status code";
 * the real reason is our handler's `{ error }` JSON body, which is only
 * reachable through `error.context` (the raw Response).
 *
 * Mirrors the vendor and admin portals' helper — the endpoints and their error
 * shapes are shared, so the unwrapping should not be reinvented per portal.
 */
export async function invokeFunction<T = unknown>(
  name: string,
  body: Record<string, unknown>,
  timeout: number = EDGE_FUNCTION_TIMEOUT_MS,
): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body, timeout });
  if (!error) return { data: (data as T) ?? null, error: null };

  return { data: null, error: await readFunctionError(error) };
}

/**
 * The `{ error }` string from a failed function response, falling back to
 * whatever supabase-js said when the body is missing or already consumed.
 */
export async function readFunctionError(error: unknown): Promise<string> {
  const context = (error as { context?: Response })?.context;
  if (context && typeof context.json === 'function') {
    try {
      const body = await context.json();
      if (body?.error) return String(body.error);
    } catch {
      /* body already consumed or not JSON — fall through */
    }
  }
  // supabase-js gives the client-side timeout above the same generic message
  // as a real network failure ("Failed to send a request to the Edge
  // Function") — there is no response to unwrap a reason from, since none
  // arrived. Named here so callers can show something a payer can act on
  // instead of that sentence.
  if (error instanceof Error && error.name === 'FunctionsFetchError') return 'request_timed_out';
  return error instanceof Error ? error.message : 'request_failed';
}
