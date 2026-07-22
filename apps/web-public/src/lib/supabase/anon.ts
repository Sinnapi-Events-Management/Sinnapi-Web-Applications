import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The public site's anonymous Supabase client — one implementation, valid in
 * both runtimes.
 *
 * Deliberately stateless (no cookies, no session persistence): the public site
 * has no auth, which is what makes it safe to call from Server Components,
 * `generateStaticParams` and sitemap generation without opting those routes out
 * of SSG/ISR — and equally safe to instantiate in the browser, where the same
 * anon key is already public.
 *
 * That symmetry is the point: a read like the vendors search is prefetched on
 * the server for the first paint and then refetched from the browser on every
 * filter change, and both paths must hit an identically-configured client.
 *
 * Returns null when env is missing so callers render graceful empty states
 * instead of throwing.
 */
let cached: SupabaseClient | null | undefined;

export function createAnonClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cached =
    url && anon
      ? createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
      : null;
  return cached;
}
