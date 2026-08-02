import { supabase } from '@/lib/supabase';

/**
 * This portal's half of the portal-access boundary.
 *
 * All three Sinnapi portals authenticate against one Supabase project, so a
 * valid credential — any valid credential, including a Sinnapi staff one —
 * produces a token GoTrue is perfectly happy with. "Do I have a session?" is
 * therefore not a question about whether the visitor belongs in THIS app.
 *
 * Two layers answer that, and this module is the client side of both:
 *
 *   1. `signInToPortal` posts the credentials to the `portal-sign-in` Edge
 *      Function, which verifies the password server-side and hands back a
 *      session only if this portal's own gate allows the account. An ineligible
 *      browser never receives a token at all.
 *   2. `checkPortalAccess` re-asks the gate for a session that arrived some
 *      other way — a restored localStorage session, a password-recovery link,
 *      a token refresh after roles changed. AuthProvider runs it on every
 *      session change and ejects on refusal.
 *
 * The rule this portal enforces (server-side, in `portal_access_vendor()`):
 * an active profile holding `vendor`, and NOT holding any admin role. The
 * `vendor` role is granted only by `approve_vendor` when an application is
 * approved — there is no self-service route to it, which is why this portal has
 * no sign-up screen.
 */

/** Which gate this app is behind. One portal, one RPC — see the migration. */
const GATE_RPC = 'portal_access_vendor';
const PORTAL = 'vendor';

/**
 * The single message every failed sign-in shows, whatever actually went wrong.
 *
 * Wrong password, unknown email, an applicant whose vendor account is not
 * approved yet, a staff credential in the wrong portal, locked out — all of it
 * reads the same. Someone probing this form with a stolen credential must not
 * be able to tell a real address from a fake one, or learn that the credential
 * they hold is privileged.
 */
export const GENERIC_SIGN_IN_ERROR = 'Invalid email or password.';

/** Shown when the sign-in endpoint itself is unreachable — not a verdict. */
const UNAVAILABLE_ERROR = 'Sign-in is temporarily unavailable. Please try again.';

/**
 * `allowed` / `denied` are verdicts from the server. `unknown` means we could
 * not reach it, which is deliberately distinct: failing closed is correct when
 * nothing has rendered yet, but signing a working session out because one
 * background token refresh hit a flaky network is a bug, not security.
 */
export type PortalVerdict = 'allowed' | 'denied' | 'unknown';

export type PortalAccess = {
  verdict: PortalVerdict;
  roles: string[];
};

type GateRow = {
  allowed: boolean | null;
  deny_reason: string | null;
  role_keys: string[] | null;
  full_name: string | null;
  account_status: string | null;
};

/**
 * Ask the server whether the CURRENT session belongs in this portal.
 *
 * The RPC takes no arguments and reads `auth.uid()` itself, so a caller cannot
 * ask about anybody else. `deny_reason` comes back for the audit trail's sake
 * and is intentionally ignored here — surfacing it would undo the whole point
 * of the generic error above.
 */
export async function checkPortalAccess(): Promise<PortalAccess> {
  const { data, error } = await supabase.rpc(GATE_RPC);

  // No verdict: transport, RLS, or a missing migration. The caller decides what
  // that means for the session it is holding.
  if (error) return { verdict: 'unknown', roles: [] };

  // `returns table (...)` arrives as a one-row array.
  const row = (Array.isArray(data) ? data[0] : data) as GateRow | undefined;
  if (!row) return { verdict: 'denied', roles: [] };

  return {
    verdict: row.allowed ? 'allowed' : 'denied',
    roles: row.role_keys ?? [],
  };
}

type SignInResponse = {
  session?: { access_token?: string; refresh_token?: string };
};

/**
 * Sign in through the audited server-side endpoint.
 *
 * Deliberately NOT `supabase.auth.signInWithPassword`: that mints a token in
 * the browser before anything has checked which portal the visitor belongs in,
 * so an admin typing their credentials here would hold a real admin token for
 * as long as it took us to notice and sign them out. Here the check happens
 * before the tokens are ever handed over, and the endpoint also counts failed
 * attempts for lockout — something a browser-side call cannot do honestly.
 *
 * Resolves to an error string to display, or `null` on success (at which point
 * the session is live and `onAuthStateChange` has fired).
 */
export async function signInToPortal(email: string, password: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke<SignInResponse>('portal-sign-in', {
    body: { email, password, portal: PORTAL },
  });

  if (error) {
    // Every refusal the endpoint makes is a 401, which supabase-js surfaces as
    // a FunctionsHttpError. Anything else is infrastructure, and saying
    // "invalid password" to someone whose password was never checked would send
    // them off resetting a credential that works.
    const status = (error as { context?: Response }).context?.status;
    return status === 401 ? GENERIC_SIGN_IN_ERROR : UNAVAILABLE_ERROR;
  }

  const accessToken = data?.session?.access_token;
  const refreshToken = data?.session?.refresh_token;
  if (!accessToken || !refreshToken) return UNAVAILABLE_ERROR;

  // Hand the vetted tokens to supabase-js, which persists them under this
  // portal's own storage key and starts the refresh timer.
  const { error: setErr } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (setErr) return UNAVAILABLE_ERROR;

  return null;
}
