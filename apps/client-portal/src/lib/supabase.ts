import { createClient } from '@supabase/supabase-js';
import { createSessionPersistence } from '@sinnapi/utils/sessionPersistence';

// Browser Supabase client. PKCE flow + auto-refresh; session persisted in
// localStorage (the SPA tradeoff — mitigated by the strict CSP in index.html).
// RLS is the security boundary; only the anon key is ever shipped to the client.
//
// `storageKey` is portal-specific on purpose. All three portals talk to the same
// Supabase project, so on the shared default key a session established in one
// portal is picked up verbatim by another on the same origin — bypassing that
// portal's own gate. A distinct key per portal makes each session belong to
// exactly one app. The gate itself lives in `src/auth/portalAccess.ts`.
//
// HOW LONG A SESSION LASTS
// Until 60 days pass without the app being opened (Supabase Dashboard →
// Authentication → Sessions → Inactivity timeout), unless the person unticked
// "Keep me signed in" at sign-in — then the session is kept in sessionStorage
// (gone when the browser closes) and the portal gate ends it after 12 hours.
// There is deliberately no idle timer in this app any more: people here expect
// to stay signed in the way they do on Facebook, and the actions that could
// cost them money ask for the password again instead (see `confirmPassword`).
const STORAGE_KEY = 'sinnapi-client-auth';

export const sessionPersistence = createSessionPersistence({
  storageKey: STORAGE_KEY,
  preferenceKey: 'sinnapi.client.rememberDevice',
});

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: STORAGE_KEY,
      storage: sessionPersistence.storage,
    },
  },
);
