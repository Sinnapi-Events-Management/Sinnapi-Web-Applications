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
