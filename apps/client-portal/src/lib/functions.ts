import { supabase } from './supabase';

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
): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
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
  return error instanceof Error ? error.message : 'request_failed';
}
