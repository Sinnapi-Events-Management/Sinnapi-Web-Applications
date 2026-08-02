import { createClient } from '@supabase/supabase-js';

// Browser Supabase client. PKCE flow + auto-refresh; session persisted in
// localStorage (the SPA tradeoff — mitigated by the strict CSP in index.html).
// RLS is the security boundary; only the anon key is ever shipped to the client.
//
// `storageKey` is portal-specific on purpose. All three portals talk to the same
// Supabase project, so on the shared default key a session established in one
// portal is picked up verbatim by another on the same origin — bypassing that
// portal's own gate. A distinct key per portal makes each session belong to
// exactly one app. The gate itself lives in `src/auth/portalAccess.ts`.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'sinnapi-client-auth',
    },
  },
);
