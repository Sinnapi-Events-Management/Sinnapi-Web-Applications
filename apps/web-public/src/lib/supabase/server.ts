import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Anonymous, read-only client for the public site. Deliberately stateless (no
// cookies/auth) so it is safe to call from Server Components, generateStaticParams,
// and sitemap generation, and does NOT opt routes out of SSG/ISR.
// Returns null when env is missing so pages render graceful empty states.
let cached: SupabaseClient | null | undefined;

export function createPublicClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cached =
    url && anon
      ? createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
      : null;
  return cached;
}
