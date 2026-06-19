import { createClient } from '@supabase/supabase-js';

// Browser Supabase client. PKCE flow + auto-refresh; session persisted in
// localStorage (the SPA tradeoff — mitigated by the strict CSP in index.html).
// RLS is the security boundary; only the anon key is ever shipped to the client.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  },
);
