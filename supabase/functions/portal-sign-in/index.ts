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
//   0. Turnstile, before we spend anything of ours on the caller — and before
//      anything is written to `portal_access_attempts` under the submitted
//      address. Cloudflare's siteverify is built for this volume; our lockout
//      table is not, and a row written before the challenge is solved is a row
//      an anonymous caller can use to lock somebody else out (see LOCKOUT
//      POISONING below).
//   1. shape check on the submission — a well-formed address and a non-empty
//      password. Nothing below can produce a verdict without them.
//   2. lockout check, keyed on the submitted email + portal, BEFORE touching
//      GoTrue — a throttle that runs after password verification throttles
//      nothing.
//   3. verify the password with the anon client.
//   4. ask the portal's own RPC, using the freshly minted user JWT, whether
//      this session belongs in this portal.
//   5. on refusal, revoke that session (scope 'local', so a legitimate session
//      the same person holds in their real portal is untouched) and answer as
//      if the password were wrong.
//   6. log the outcome either way — including step 3 failures, which never
//      reach an auth.uid()-scoped RPC and so would otherwise be invisible.
//
// EVERY *VERDICT* LOOKS THE SAME — AN OUTAGE DOES NOT
// Unknown email, wrong password, suspended account, staff credential in the
// client portal, locked out — all return 401 `invalid_credentials`. The
// machine-readable reason goes to `portal_access_attempts` and never to the
// caller: an attacker probing a public login form with a stolen credential must
// not learn that the credential is real, let alone that it is privileged.
//
// What must NOT be folded into that 401 is a failure that never examined the
// password at all. GoTrue refusing us because the project has CAPTCHA
// protection switched on, or the email provider disabled, or because we hit an
// auth rate limit, says nothing whatsoever about the credential — and answering
// "invalid email or password" sends a user who typed their password correctly
// off to reset a password that works, while hiding a total sign-in outage
// behind the one message nobody investigates. Those return 503
// `sign_in_unavailable` (which the portals already render as "temporarily
// unavailable"), name the GoTrue code in the logs and in the audit trail, and
// are excluded from the lockout counter. The distinction is safe precisely
// because it is a property of OUR infrastructure, not of the account: it is
// identical for a real address and an invented one. See `classifyAuthFailure`.
//
// BOT PROTECTION
// The three sign-in forms carry a Cloudflare Turnstile widget, and step 0 below
// redeems its token before anything else happens. Without it this endpoint is a
// credential-stuffing oracle that costs an attacker one HTTP request per guess:
// the lockout in step 2 is per-address, so it slows a targeted attack on one
// account and does nothing at all about a list of ten thousand.
//
// TURNSTILE HERE, NOT IN GOTRUE — AND NOT BOTH
// The token is single-use: Cloudflare redeems it at the first siteverify call
// and answers `timeout-or-duplicate` to every later one. This function spends it
// itself in step 0, so it cannot also hand the same token to GoTrue. That makes
// the two mutually exclusive, and it is a deployment fact worth stating plainly:
//
//   Supabase Dashboard → Authentication → Attack Protection → "Enable Captcha
//   protection" MUST BE OFF for this project.
//
// With it on, every `signInWithPassword` this function makes is refused with
// `captcha_failed` no matter what the visitor typed, and password sign-in is
// dead in all three portals while the browser-side flows (confirmation links,
// recovery links, `verifyOtp`) keep working — because none of them go through a
// password grant. Nothing is lost by turning it off: the challenge is still
// enforced, one layer higher, on an endpoint GoTrue's setting could not have
// protected anyway. Step 3 detects this case explicitly rather than letting it
// masquerade as a wrong password.
//
// LOCKOUT POISONING
// `portal_lockout_active` counts denial rows for an email+portal. Any refusal
// recorded BEFORE the password is examined is therefore a free way for an
// anonymous caller to lock a known address out of a portal — five requests, no
// account needed. Two things prevent that: the captcha now precedes every
// `record()` call, and the counter ignores reasons that are not credential
// verdicts (`captcha:*`, `unavailable:*`, `malformed_submission`) — see the
// 0802d migration. Both halves are required; either one alone leaves the hole
// open.
//
// Required env (all standard for this project):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//   ALLOWED_ORIGINS — comma-separated portal origins (see _shared/cors.ts)
//   TURNSTILE_SECRET — see _shared/turnstile.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handler, json } from '../_shared/http.ts';
import { adminClient, HttpError } from '../_shared/supabase.ts';
import { verifyCaptcha, clientIp } from '../_shared/turnstile.ts';
import { parseUserAgent } from '../_shared/userAgent.ts';

const PORTALS = ['client', 'vendor', 'admin'] as const;
type Portal = (typeof PORTALS)[number];

/** Maps a portal to its own independent gate. One portal, one function. */
const GATE: Record<Portal, string> = {
  client: 'portal_access_client',
  vendor: 'portal_access_vendor',
  admin: 'portal_access_admin',
};

type Body = { email?: string; password?: string; portal?: string; captchaToken?: string };

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

/** The shape supabase-js gives an `AuthError`; all fields are best-effort. */
type AuthErrorLike = { code?: string; status?: number; message?: string; name?: string } | null;

/**
 * What kind of failure did GoTrue just hand us?
 *
 *   `credentials`  — a verdict about this account. Answered as the generic 401,
 *                    counted towards lockout, indistinguishable from every
 *                    other refusal.
 *   `unconfirmed`  — a verdict too, but the one with an innocent person behind
 *                    it: same 401, plus a re-issued confirmation link.
 *   `unavailable`  — not a verdict at all. Our side is misconfigured or down.
 *                    503, loud logs, not counted towards lockout.
 */
type AuthFailure = { kind: 'credentials' | 'unconfirmed' | 'unavailable'; reason: string };

/**
 * Codes that are genuinely about the account. `user_banned` is deliberately in
 * here rather than in the unavailable set: a banned account is a real verdict,
 * and answering it differently would turn this endpoint into a way to ask
 * "is this address suspended?".
 */
const CREDENTIAL_CODES = new Set([
  'invalid_credentials',
  'invalid_grant',
  'user_not_found',
  'user_banned',
  'validation_failed',
]);

/**
 * Codes that mean the password was never checked. Every one of these is a
 * project-level setting or a capacity limit — all-or-nothing conditions that
 * are identical for every caller and therefore leak nothing when reported as
 * distinct from a credential refusal.
 *
 * `captcha_failed` and `email_provider_disabled` are the two that silently kill
 * password sign-in platform-wide, which is why they get named in the log line
 * rather than only counted.
 */
const UNAVAILABLE_CODES = new Set([
  'captcha_failed',
  'email_provider_disabled',
  'signup_disabled',
  'over_request_rate_limit',
  'request_timeout',
  'unexpected_failure',
  'service_unavailable',
]);

/**
 * Did GoTrue refuse because the address was never confirmed, rather than
 * because the credentials were wrong?
 *
 * Matched on the error code with a message fallback: the code is the stable
 * contract, but older GoTrue builds only set the message, and getting this
 * wrong in the false-positive direction would mail a confirmation link on every
 * mistyped password.
 */
function isUnconfirmed(err: AuthErrorLike): boolean {
  if (!err) return false;
  if (err.code === 'email_not_confirmed') return true;
  return /email not confirmed/i.test(err.message ?? '');
}

/**
 * Sort a failed password grant into the three kinds above.
 *
 * Reads the stable `code` first, then falls back to HTTP status and message
 * text for builds and transport errors that carry no code at all.
 *
 * The default is `unavailable`, and that is the safe default in both
 * directions. It grants nobody anything — the caller still gets no session —
 * and an unrecognised GoTrue failure is far more likely to be our problem than
 * a statement about the password. The cost of the opposite default is the bug
 * this branch was written to fix: a configuration fault that reports itself, to
 * every user and in the audit trail, as "wrong password".
 */
function classifyAuthFailure(err: AuthErrorLike, hasSession: boolean): AuthFailure {
  // A 2xx with nothing in it is not a credential verdict either — it means the
  // response shape changed under us, or the SDK returned a partial payload.
  if (!err) return { kind: 'unavailable', reason: hasSession ? 'empty_user' : 'empty_session' };

  const code = err.code ?? '';
  const status = typeof err.status === 'number' ? err.status : 0;
  const message = err.message ?? '';

  if (isUnconfirmed(err)) return { kind: 'unconfirmed', reason: 'email_not_confirmed' };
  if (code && CREDENTIAL_CODES.has(code)) return { kind: 'credentials', reason: code };
  if (code && UNAVAILABLE_CODES.has(code)) return { kind: 'unavailable', reason: code };

  // Message fallback for the one verdict old builds send without a code.
  if (/invalid login credentials|invalid email or password/i.test(message)) {
    return { kind: 'credentials', reason: 'invalid_credentials' };
  }
  // The other side of that coin: GoTrue words the captcha refusal as
  // "captcha protection: request disallowed (…)" and has not always set a code.
  if (/captcha/i.test(message)) return { kind: 'unavailable', reason: 'captcha_failed' };

  // Transport and gateway conditions, none of which examined a password:
  // 401 is an API key the gateway rejected, 429 a rate limit, 5xx an outage,
  // 0 a fetch that never completed (`AuthRetryableFetchError`).
  if (status === 401 || status === 403) return { kind: 'unavailable', reason: 'auth_key_rejected' };
  if (status === 429) return { kind: 'unavailable', reason: 'over_request_rate_limit' };
  if (status >= 500) return { kind: 'unavailable', reason: `auth_http_${status}` };
  if (status === 0) return { kind: 'unavailable', reason: 'auth_unreachable' };

  return { kind: 'unavailable', reason: `unclassified:${code || status || err.name || 'unknown'}` };
}

/**
 * Re-issue the confirmation link for an unconfirmed client, best-effort.
 *
 * Delegated to `client-sign-up` rather than reimplemented, so there is exactly
 * one place that mints confirmation links and one throttle governing them — a
 * second copy here would be a second way to bypass the per-address cap.
 *
 * Safe to call on a failed sign-in: that endpoint mails only an address that
 * genuinely has an unconfirmed account, answers identically either way, and
 * applies its own cooldown. The worst an attacker who guesses an unconfirmed
 * address can do is cause its real owner to receive their own confirmation link,
 * at most once per cooldown.
 *
 * Never throws. A sign-in that is going to be refused anyway must not turn into
 * a 500 because a courtesy email failed.
 */
async function maybeResendConfirmation(email: string): Promise<void> {
  try {
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/client-sign-up`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        apikey: key,
      },
      body: JSON.stringify({ action: 'resend', email }),
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'unknown';
    console.error(JSON.stringify({ level: 'error', message: 'resend_dispatch_failed', detail }));
  }
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
    // Country of origin, free from the Cloudflare edge that fronts Supabase
    // Functions. Deliberately the coarsest location available — enough to show
    // an admin that a locked account was hit from somewhere unexpected, without
    // a geolocation lookup resolving anyone to a city. Absent on a self-hosted
    // or local runtime, which lands as null.
    const country = req.headers.get('cf-ipcountry');
    // Parsed once per request, here, because this is the only place that holds
    // the browser's own user agent: anything the database derives later would
    // be describing supabase-js calling PostgREST, not the person signing in.
    // The raw string is stored alongside, so a wrong parse never destroys the
    // evidence it was made from.
    const ua = parseUserAgent(userAgent);

    // Everything below funnels through these three so no branch can accidentally
    // leak a distinguishing response or skip the trail.
    const record = async (
      outcome: 'granted' | 'denied',
      reason: string | null,
      profileId: string | null = null,
    ) => {
      // The function logs are the only place a developer can see WHY a sign-in
      // was refused — the caller is told nothing and the audit table needs a
      // query and a permission. One structured line per decision closes that
      // gap. It carries the reason and the portal and no credential material;
      // the address stays in the audit row, where reading it is a granted
      // permission rather than a log tail.
      console.log(
        JSON.stringify({ level: 'info', message: 'portal_sign_in', portal, outcome, reason }),
      );
      // Telemetry must never be the reason a legitimate sign-in fails — hence
      // the catch, which also covers a network-level rejection rather than just
      // the `{ error }` a reachable PostgREST returns. A silently broken audit
      // trail is worse than a noisy one, so both paths log loudly.
      //
      // One call, two tables: `log_portal_attempt` writes the attempt row AND
      // mirrors the event into `audit_logs` (0802e). Doing that in the database
      // rather than here keeps the two in one transaction and makes it
      // impossible to record an attempt the audit trail never hears about.
      try {
        const { error } = await admin.rpc('log_portal_attempt', {
          p_portal: portal,
          p_email: email || null,
          p_profile_id: profileId,
          p_outcome: outcome,
          p_reason: reason,
          p_ip: ip,
          p_user_agent: userAgent,
          p_country: country,
          p_device: ua.device,
          p_os: ua.os,
          p_browser: ua.browser,
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

    /**
     * Our fault, not the caller's. Recorded with the `unavailable:` prefix the
     * lockout counter ignores, so an outage cannot lock every user out of the
     * platform for the length of the window on top of being an outage.
     */
    const unavailable = async (reason: string) => {
      await record('denied', `unavailable:${reason}`);
      return json(req, { error: 'sign_in_unavailable' }, 503);
    };

    // --- 0. Prove a browser solved a challenge for this attempt.
    //
    // FIRST, before any `record()` call: a denial row written for the submitted
    // address by a caller who has not solved a challenge is a lockout an
    // anonymous attacker can inflict on a known address at will.
    //
    // Answered as 403 `captcha_failed` rather than folded into the generic 401,
    // for two reasons. The form must be able to tell the two apart: Turnstile
    // tokens are single-use, so a refusal the visitor reads as "wrong password"
    // would send them retrying with a spent token forever. And the distinction
    // gives an attacker nothing — it says only that the challenge failed, never
    // anything about whether the address or password was real. The attempt is
    // still recorded, so a flood of these is visible in the audit trail.
    const captcha = await verifyCaptcha(b?.captchaToken, clientIp(req));
    if (!captcha.ok) {
      await record('denied', `captcha:${captcha.reason}`);
      return json(req, { error: 'captcha_failed' }, 403);
    }

    // --- 1. A malformed submission is still an attempt worth recording: it is
    // the shape automated credential stuffing arrives in. It is not worth
    // counting — nothing was tested against the account — and the 0802d
    // exclusion list keeps it out of the lockout tally.
    if (!EMAIL_RE.test(email) || password.length === 0) {
      return await deny('malformed_submission');
    }

    // --- 2. Throttle before spending a password verification on this caller.
    const { data: lockedOut, error: lockErr } = await admin.rpc('portal_lockout_active', {
      p_email: email,
      p_portal: portal,
    });
    if (lockErr) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'lockout_check_failed',
          detail: lockErr.message,
        }),
      );
      return await unavailable('lockout_check_failed');
    }
    if (lockedOut) return await deny('locked_out');

    // --- 3. Verify the password. This mints a real session; from here on every
    // failure path must revoke it.
    const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: auth, error: authErr } = await anon.auth.signInWithPassword({ email, password });

    if (authErr || !auth?.session || !auth?.user) {
      const failure = classifyAuthFailure(authErr as AuthErrorLike, Boolean(auth?.session));

      if (failure.kind === 'unavailable') {
        // Loud and specific: these are the failures a developer would otherwise
        // spend a day mistaking for a forgotten password. The two configuration
        // faults that kill password sign-in outright get the remedy spelled out
        // in the log line, because the code alone does not say what to change.
        const remedy =
          failure.reason === 'captcha_failed'
            ? 'Supabase Auth CAPTCHA protection is ON; this endpoint already redeems the Turnstile token and cannot pass it to GoTrue. Turn it off: Dashboard > Authentication > Attack Protection.'
            : failure.reason === 'email_provider_disabled'
              ? 'Email/password sign-in is disabled for this project: Dashboard > Authentication > Providers > Email.'
              : undefined;
        console.error(
          JSON.stringify({
            level: 'error',
            message: 'password_grant_unavailable',
            portal,
            reason: failure.reason,
            status: (authErr as AuthErrorLike)?.status ?? null,
            detail: (authErr as AuthErrorLike)?.message ?? null,
            remedy,
          }),
        );
        return await unavailable(failure.reason);
      }

      // A client whose address was never confirmed is the one refusal with a
      // real user behind it who has done nothing wrong, so quietly re-issue the
      // link before answering. The answer itself does not change — see
      // `maybeResendConfirmation` for why this leaks nothing.
      if (failure.kind === 'unconfirmed') {
        if (portal === 'client') await maybeResendConfirmation(email);
        return await deny('email_not_confirmed');
      }

      // Keep the GoTrue code on the row. The caller still gets one 401 for
      // everything; the operator gets to tell "no such address" apart from
      // "wrong password" when reading the trail, which is the difference
      // between diagnosing a support ticket and guessing at it.
      return await deny(`bad_credentials:${failure.reason}`);
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

    // --- 4. Ask this portal's own gate, as the user, with the user's token.
    // Using the user-scoped client (not service_role) means the RPC resolves
    // `auth.uid()` itself and cannot be pointed at somebody else's account.
    const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${session.access_token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: gate, error: gateErr } = await asUser.rpc(GATE[portal]);
    if (gateErr) {
      // The password was right and the gate is unreachable — a missing
      // migration, a revoked grant, a database that is down. Same reasoning as
      // step 3: this is our outage, not a verdict, so it must not read as a bad
      // password and must not count towards the lockout.
      await revoke();
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'gate_rpc_failed',
          portal,
          rpc: GATE[portal],
          detail: gateErr.message,
        }),
      );
      return await unavailable('gate_rpc_failed');
    }

    // `returns table (...)` arrives as a one-row array over PostgREST.
    const verdict = (Array.isArray(gate) ? gate[0] : gate) as GateRow | undefined;

    // --- 5. Fail closed: an unreadable verdict is a refusal, not a pass.
    if (!verdict?.allowed) {
      await revoke();
      // The same courtesy as the GoTrue branch above, for the case where the
      // project has email confirmation switched off in Auth and so the refusal
      // arrives here as a `pending` profile instead. Both routes lead to one
      // unconfirmed client and one re-issued link.
      if (portal === 'client' && verdict?.deny_reason === 'profile_pending') {
        await maybeResendConfirmation(email);
      }
      return await deny(verdict?.deny_reason ?? 'gate_unavailable', userId);
    }

    // --- 6. Granted. `log_portal_attempt` also stamps profiles.last_login_at.
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
