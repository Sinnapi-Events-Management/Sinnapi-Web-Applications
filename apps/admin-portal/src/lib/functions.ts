import { supabase } from './supabase';

/**
 * Invoke an Edge Function and normalise its failure into a human-readable
 * message. supabase-js resolves any non-2xx response to a FunctionsHttpError
 * whose `.message` is the unhelpful "Edge Function returned a non-2xx status
 * code"; the real reason is our handler's `{ error }` JSON body, which is only
 * reachable through `error.context` (the raw Response).
 */
export async function invokeFunction<T = unknown>(
  name: string,
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (!error) return { data: (data as T) ?? null, error: null };

  let message = error.message;
  const context = (error as { context?: Response }).context;
  if (context && typeof context.json === 'function') {
    try {
      const payload = (await context.json()) as { error?: string };
      if (payload?.error) message = payload.error;
    } catch {
      // Non-JSON body — keep the default message.
    }
  }
  return { data: null, error: message };
}
