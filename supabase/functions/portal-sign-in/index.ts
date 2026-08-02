// portal-sign-in — the single audited chokepoint for password sign-in across
// the client, vendor and admin portals. Public endpoint (verify_jwt = false):
// there is no JWT yet, that is the point.
//
// WHY AN EDGE FUNCTION AND NOT `signInWithPassword` IN THE BROWSER
// All three portals share one Supabase project, so GoTrue happily mints a token
// for any valid credential regardless of which portal's login form was used.
// Doing the portal check in the SPA means the ineligible browser has already
// been handed a working token and we are politely asking it to throw the token
// away. Here the credentials are verified server-side and the session is
// returned ONLY if `portal_access_<portal>()` says yes — an admin credential
// typed into the client portal never produces a token the browser can see.
//
// THE SEQUENCE (order matters)
//   1. lockout check, keyed on the submitted email + portal, BEFORE touching
//      GoTrue — a throttle that runs after password verification throttles
//      nothing.
//   2. verify the password with the anon client.
//   3. ask the portal's own RPC, using the freshly minted user JWT, whether
//      this session belongs in this portal.
//   4. on refusal, revoke that session (scope 'local', so a legitimate session
//      the same person holds in their real portal is untouched) and answer as
//      if the password were wrong.
//   5. log the outcome either way — including step 2 failures, which never
//      reach an auth.uid()-scoped RPC and so would otherwise be invisible.
//
// EVERY REFUSAL LOOKS THE SAME
// Unknown email, wrong password, suspended account, staff credential in the
// client portal, locked out — all return 401 `invalid_credentials`. The
// machine-readable reason goes to `portal_access_attempts` and never to the
// caller: an attacker probing a public login form with a stolen credential must
// not learn that the credential is real, let alone that it is privileged.
//
// Required env (all standard for this project):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//   ALLOWED_ORIGINS — comma-separated portal origins (see _shared/cors.ts)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handler, json } from '../_shared/http.ts';
import { adminClient, HttpError } from '../_shared/supabase.ts';

const PORTALS = ['client', 'vendor', 'admin'] as const;
type Portal = (typeof PORTALS)[number];

/** Maps a portal to its own independent gate. One portal, one function. */
const GATE: Record<Portal, string> = {
  client: 'portal_access_client',
  vendor: 'portal_access_vendor',
  admin: 'portal_access_admin',
};

type Body = { email?: string; password?: string; portal?: string };

type GateRow = {
  allowed: boolean;
  deny_reason: string | null;
  role_keys: string[] | null;
  full_name: string | null;
  account_status: string | null;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function isPortal(v: unknown): v is Portal {
  return typeof v === 'string' && (PORTALS as readonly string[]).includes(v);
}

Deno.serve(
  handler(async (req) => {
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed');

    const b = (await req.json().catch(() => null)) as Body | null;
    const portal = b?.portal;
    if (!isPortal(portal)) throw new HttpError(422, 'invalid:portal');

    const email = String(b?.email ?? '')
      .trim()
      .toLowerCase();
    const password = String(b?.password ?? '');

    const admin = adminClient();
    const ip = req.headers.get('x-forwarded-for');
    const userAgent = req.headers.get('user-agent');

    // Everything below funnels through these two so no branch can accidentally
    // leak a distinguishing response or skip the trail.
    const record = async (
      outcome: 'granted' | 'denied',
      reason: string | null,
      profileId: string | null = null,
    ) => {
      // Telemetry must never be the reason a legitimate sign-in fails — hence
      // the catch, which also covers a network-level rejection rather than just
      // the `{ error }` a reachable PostgREST returns. A silently broken audit
      // trail is worse than a noisy one, so both paths log loudly.
      try {
        const { error } = await admin.rpc('log_portal_attempt', {
          p_portal: portal,
          p_email: email || null,
          p_profile_id: profileId,
          p_outcome: outcome,
          p_reason: reason,
          p_ip: ip,
          p_user_agent: userAgent,
        });
        if (error) throw new Error(error.message);
      } catch (e) {
        const detail = e instanceof Error ? e.message : 'unknown';
        console.error(JSON.stringify({ level: 'error', message: 'attempt_log_failed', detail }));
      }
    };

    const deny = async (reason: string, profileId: string | null = null) => {
      await record('denied', reason, profileId);
      return json(req, { error: 'invalid_credentials' }, 401);
    };

    // A malformed submission is still an attempt worth counting: it is the
    // shape automated credential stuffing arrives in.
    if (!EMAIL_RE.test(email) || password.length === 0) {
      return await deny('malformed_submission');
    }

    // --- 1. Throttle before spending a password verification on this caller.
    const { data: lockedOut, error: lockErr } = await admin.rpc('portal_lockout_active', {
      p_email: email,
      p_portal: portal,
    });
    if (lockErr) throw new HttpError(500, 'sign_in_unavailable');
    if (lockedOut) return await deny('locked_out');

    // --- 2. Verify the password. This mints a real session; from here on every
    // failure path must revoke it.
    const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: auth, error: authErr } = await anon.auth.signInWithPassword({ email, password });
    if (authErr || !auth?.session || !auth?.user) {
      return await deny('bad_credentials');
    }

    const session = auth.session;
    const userId = auth.user.id;

    // 'local' revokes only the session this function just created — a staff
    // member who mistypes the portal keeps the admin session they already have
    // open elsewhere, so a wrong-portal login cannot be used to log someone out.
    const revoke = async () => {
      const { error } = await admin.auth.admin.signOut(session.access_token, 'local');
      if (error)
        console.error(
          JSON.stringify({ level: 'error', message: 'revoke_failed', detail: error.message }),
        );
    };

    // --- 3. Ask this portal's own gate, as the user, with the user's token.
    // Using the user-scoped client (not service_role) means the RPC resolves
    // `auth.uid()` itself and cannot be pointed at somebody else's account.
    const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${session.access_token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: gate, error: gateErr } = await asUser.rpc(GATE[portal]);
    if (gateErr) {
      await revoke();
      throw new HttpError(500, 'sign_in_unavailable');
    }

    // `returns table (...)` arrives as a one-row array over PostgREST.
    const verdict = (Array.isArray(gate) ? gate[0] : gate) as GateRow | undefined;

    // --- 4. Fail closed: an unreadable verdict is a refusal, not a pass.
    if (!verdict?.allowed) {
      await revoke();
      return await deny(verdict?.deny_reason ?? 'gate_unavailable', userId);
    }

    // --- 5. Granted. `log_portal_attempt` also stamps profiles.last_login_at.
    await record('granted', null, userId);

    // The browser sets this with `supabase.auth.setSession()`. Only the two
    // tokens are needed for that; the extras let the SPA render immediately
    // without a follow-up round trip.
    return json(
      req,
      {
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at ?? null,
          expires_in: session.expires_in ?? null,
          token_type: session.token_type ?? 'bearer',
        },
        profile: {
          id: userId,
          full_name: verdict.full_name,
          roles: verdict.role_keys ?? [],
          must_change_password: Boolean(auth.user.user_metadata?.must_change_password),
        },
      },
      200,
    );
  }),
);
