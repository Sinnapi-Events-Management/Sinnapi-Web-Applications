import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Privileged client — bypasses RLS. NEVER expose the service key to the browser.
export function adminClient(): SupabaseClient {
  return createClient(URL, SERVICE, { auth: { persistSession: false } });
}

// User-scoped client — RLS applies as the calling user (from their JWT).
export function userClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get('Authorization') ?? '';
  return createClient(URL, ANON, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
}

/**
 * Is this request one Edge Function calling another, rather than a browser?
 *
 * True only when the bearer token IS the service-role key, which exists solely
 * in the functions' own environment and can never reach a browser. Used to
 * exempt trusted server-to-server calls from checks that only make sense for a
 * visitor — a CAPTCHA token, for instance, which a function has no way to hold.
 *
 * Compared against the raw key rather than decoded as a JWT on purpose: the
 * question is "did the caller present our secret", not "does this token claim
 * the service_role". A forged claim would pass the second test.
 */
export function isServiceRoleCaller(req: Request): boolean {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  return token.length > 0 && token === SERVICE;
}

/**
 * Is this request pg_cron, presenting the secret Sinnapi mints for it?
 *
 * Use this instead of `isServiceRoleCaller` for any function whose ONLY
 * caller is a scheduled job (notification-dispatch, the lifecycle sweeps,
 * the newsletter worker) — never for a function a real service-role caller
 * also needs to reach legitimately (see `client-sign-up`'s internal resend,
 * `send-migration-credentials`), which must keep checking the real key.
 *
 * WHY NOT `isServiceRoleCaller` HERE
 * `SERVICE` is the project's `service_role` key, which lives in two places
 * that do not update together: Supabase's own reserved Edge Function secret
 * (kept in sync automatically) and the `service_role_key` Vault secret a
 * migration's `cron.schedule` reads to build the job's Authorization header
 * (set by hand once, synced by nobody). A key rotation — including
 * Supabase's own end-of-2026 retirement of the legacy anon/service_role
 * keys in favour of publishable/secret keys — silently breaks every
 * pg_cron-triggered function at once, and only in environments where that
 * rotation actually happened (production, never a fresh local reset).
 * `CRON_DISPATCH_SECRET` is minted by Sinnapi, stored nowhere Supabase's
 * account-level key lifecycle touches, and never needs to change unless
 * Sinnapi itself decides to rotate it — at which point both copies (this
 * function's secret and the Vault copy the cron job reads live) are
 * updated together, deliberately, in one action.
 */
export function isCronCaller(req: Request): boolean {
  const expected = Deno.env.get('CRON_DISPATCH_SECRET') ?? '';
  if (expected.length === 0) return false; // unset must fail closed, not open
  const header = req.headers.get('Authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  return token.length > 0 && token === expected;
}

// Resolve the caller's user id from their JWT (throws if unauthenticated).
export async function requireUser(req: Request): Promise<string> {
  const { data, error } = await userClient(req).auth.getUser();
  if (error || !data.user) throw new HttpError(401, 'unauthorized');
  return data.user.id;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
