'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Browser (anon) Supabase client for the public site's interactive islands —
// e.g. uploading vendor-application files to the private `application-intake`
// bucket and invoking the `vendor-application` Edge Function. Stateless: no
// session persistence (the public site has no auth). Returns null when env is
// missing so callers can surface a graceful "try again later" state.
let cached: SupabaseClient | null | undefined;

export function createBrowserClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cached =
    url && anon
      ? createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
      : null;
  return cached;
}
