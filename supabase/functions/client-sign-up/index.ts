// client-sign-up — self-registration for the client portal, plus the two ways a
// confirmation link gets re-issued. Public endpoint (verify_jwt = false); the
// one privileged action authenticates itself, see `admin_resend` below.
//
// WHY AN EDGE FUNCTION AND NOT `supabase.auth.signUp` IN THE BROWSER
// Three things the browser call cannot do:
//
//   1. Send OUR email. `signUp` hands off to GoTrue's built-in templates, which
//      is why confirmation mail was the only Sinnapi email not using the branded
//      shell in `_shared/emailTemplate.ts`. Here the account is created with
//      `generateLink`, which mints the confirmation token WITHOUT sending
//      anything, and the message goes out over the same SMTP transport as every
//      other transactional email.
//   2. Throttle honestly. A per-address cap and a per-IP cap enforced in the
//      browser are enforced nowhere.
//   3. Keep the account inert until the address is proven. The profile lands as
//      `pending` (see the 0802b migration) and `portal_access_client()` already
//      refuses anything that isn't `active`, so an unconfirmed signup — a bot's,
//      or a typo'd address — holds nothing.
//
// LINKS ARE BUILT, NOT BORROWED
// `generateLink` also returns a ready-made `action_link`, and it is the wrong
// one to use here: it points at GoTrue's `/verify` endpoint, which completes in
// the implicit flow and redirects with tokens in the URL fragment. Our portals
// run `flowType: 'pkce'` and the callback expects to exchange a code it has a
// verifier for — a code that never existed, because the browser did not start
// this flow. So we take the `hashed_token` and address our own callback with it,
// which the client resolves with `verifyOtp`. That path is flow-agnostic and is
// the documented pattern for a custom email provider.
//
// RESENDS USE `magiclink`, NOT `signup`
// Re-issuing with `type: 'signup'` needs a `password` argument for an account
// that already has one. Today GoTrue ignores it for an existing unconfirmed
// user — but that is filed as a bug rather than a guarantee, and the day it is
// "fixed" our resend would silently overwrite the caller's real password.
// `magiclink` takes no password at all, so the mistake is structurally
// impossible, and it confirms the address on use exactly as the signup link
// does.
//
// BOT PROTECTION
// The two anonymous actions each carry a Cloudflare Turnstile token, verified
// before any work happens. The throttles above are per-address and per-IP, and
// a botnet is neither: without the challenge, `signup` is a free way to create
// accounts at the rate of one per address and `resend` is a free way to mail
// anyone whose address is known to be pending. `admin_resend` is exempt because
// it is already gated on `users.manage`, and the internal resend that
// `portal-sign-in` fires is exempt because it presents the service-role key —
// see `isServiceRoleCaller`.
//
// Required env:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//   SMTP_HOST / SMTP_USER / SMTP_PASS      — see _shared/email.ts
//   ALLOWED_ORIGINS                        — see _shared/cors.ts
//   TURNSTILE_SECRET                       — see _shared/turnstile.ts
// Optional env:
//   CLIENT_PORTAL_URL        — where the confirmation link lands; falls back to
//                              PUBLIC_SITE_URL
//   CONFIRM_LINK_EXPIRY_HOURS — quoted in the email copy only. The real expiry
//                              is the project's Auth "Email OTP Expiration"
//                              setting; keep the two in step (24h => 86400).
import { handler, json } from '../_shared/http.ts';
import {
  adminClient,
  userClient,
  requireUser,
  isServiceRoleCaller,
  HttpError,
} from '../_shared/supabase.ts';
import { sendEmail, PUBLIC_SITE_URL } from '../_shared/email.ts';
import { verifyCaptcha, clientIp } from '../_shared/turnstile.ts';
import { parseUserAgent } from '../_shared/userAgent.ts';
import { confirmSignupEmail } from './emails.ts';
import { confirmSubscriptionEmail, confirmSubscriptionUrl } from '../_shared/marketingEmails.ts';

const ACTIONS = ['signup', 'resend', 'admin_resend'] as const;
type Action = (typeof ACTIONS)[number];

/** Mirrors the client-portal zod schema — the browser's copy is a convenience. */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;
const SELF_SERVICE_ROLES = ['client', 'event_planner'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Body = {
  action?: string;
  fullName?: string;
  email?: string;
  password?: string;
  role?: string;
  /** admin_resend only. */
  profileId?: string;
  /** Turnstile token. Required for `signup` and browser-driven `resend`. */
  captchaToken?: string;
  /** Newsletter opt-in. Absent or false means no consent was given. */
  marketingConsent?: boolean;
  /**
   * The exact sentence rendered beside the checkbox. Stored verbatim as the
   * Art.7(1) evidence: the wording on the sign-up page will be rewritten over
   * the years, and "they agreed to whatever the page says today" is not a
   * defence. Sent by the client so the record matches what was on screen; the
   * server falls back to a canonical copy if it is missing.
   */
  marketingConsentText?: string;
};

/** Days a double opt-in link stays live — mirrors the DB's 7-day expiry. */
const MARKETING_CONFIRM_EXPIRY_DAYS = 7;

const MARKETING_CONSENT_FALLBACK =
  'I would like to receive Sinnapi newsletters, planning tips and occasional offers by email.';

const CLIENT_PORTAL_URL = (Deno.env.get('CLIENT_PORTAL_URL') ?? PUBLIC_SITE_URL).replace(
  /\/+$/,
  '',
);
const EXPIRY_HOURS = Number(Deno.env.get('CONFIRM_LINK_EXPIRY_HOURS') ?? '24');

function isAction(v: unknown): v is Action {
  return typeof v === 'string' && (ACTIONS as readonly string[]).includes(v);
}

/**
 * Point the confirmation at our own callback carrying the one-time token, so
 * the SPA can finish with `verifyOtp` regardless of auth flow type.
 */
function confirmUrl(hashedToken: string, type: 'signup' | 'magiclink'): string {
  const u = new URL(`${CLIENT_PORTAL_URL}/auth/callback`);
  u.searchParams.set('token_hash', hashedToken);
  u.searchParams.set('type', type);
  return u.toString();
}

Deno.serve(
  handler(async (req) => {
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed');

    const b = (await req.json().catch(() => null)) as Body | null;
    const action = b?.action ?? 'signup';
    if (!isAction(action)) throw new HttpError(422, 'invalid:action');

    const admin = adminClient();
    const ip = req.headers.get('x-forwarded-for');
    const userAgent = req.headers.get('user-agent');
    // Same request context the sign-in endpoint captures, for the same reason:
    // this is the only point in the chain that sees the visitor's own headers.
    // Country is Cloudflare's, country-granularity only — see the data
    // protection note in 0802c.
    const country = req.headers.get('cf-ipcountry');
    const ua = parseUserAgent(userAgent);

    const record = async (
      outcome: 'sent' | 'blocked' | 'rejected',
      email: string | null,
      reason: string | null = null,
      profileId: string | null = null,
    ) => {
      // Never the reason a signup fails; a broken trail is still worth shouting
      // about. Same contract as `log_portal_attempt` in portal-sign-in — and,
      // since 0802e, the same two-tables-one-call arrangement: this writes the
      // `signup_attempts` row and mirrors the event into `audit_logs`.
      try {
        const { error } = await admin.rpc('log_signup_attempt', {
          p_kind: action,
          p_outcome: outcome,
          p_email: email,
          p_profile_id: profileId,
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
        console.error(JSON.stringify({ level: 'error', message: 'signup_log_failed', detail }));
      }
    };

    /** Mint a fresh confirmation link and mail it. Shared by all three actions. */
    const sendConfirmation = async (opts: {
      email: string;
      fullName: string;
      type: 'signup' | 'magiclink';
      password?: string;
      metadata?: Record<string, unknown>;
      resend: boolean;
    }): Promise<{ userId: string | null; sent: boolean }> => {
      const { data, error } = await admin.auth.admin.generateLink(
        opts.type === 'signup'
          ? {
              type: 'signup',
              email: opts.email,
              password: opts.password!,
              options: {
                data: opts.metadata,
                redirectTo: `${CLIENT_PORTAL_URL}/auth/callback`,
              },
            }
          : {
              type: 'magiclink',
              email: opts.email,
              options: { redirectTo: `${CLIENT_PORTAL_URL}/auth/callback` },
            },
      );

      if (error || !data?.properties?.hashed_token) {
        throw new HttpError(400, `link_generation_failed:${error?.message ?? 'no_token'}`);
      }

      const result = await sendEmail(
        confirmSignupEmail({
          fullName: opts.fullName,
          email: opts.email,
          confirmUrl: confirmUrl(data.properties.hashed_token, opts.type),
          expiryHours: EXPIRY_HOURS,
          resend: opts.resend,
        }),
      );

      // Reported, not thrown: what a failed send means depends on whether this
      // call also created the account, and only the caller knows that.
      return { userId: data.user?.id ?? null, sent: result.sent };
    };

    // ── admin_resend ────────────────────────────────────────────────────────
    // Privileged, and the reason this function is not simply `verify_jwt = true`:
    // signup itself must stay open to anonymous callers. So this branch does its
    // own authentication, with the caller's own JWT, before touching anything.
    if (action === 'admin_resend') {
      await requireUser(req);
      const caller = userClient(req);
      const { data: allowed, error: permErr } = await caller.rpc('has_permission', {
        p_permission: 'users.manage',
      });
      if (permErr) throw new HttpError(400, permErr.message);
      if (!allowed) throw new HttpError(403, 'forbidden');

      const profileId = b?.profileId;
      if (!profileId || !UUID_RE.test(profileId)) throw new HttpError(422, 'invalid:profileId');

      const { data: profile, error: profErr } = await admin
        .from('profiles')
        .select('id, email, full_name, status, deleted_at')
        .eq('id', profileId)
        .maybeSingle();
      if (profErr) throw new HttpError(400, profErr.message);
      if (!profile || profile.deleted_at) throw new HttpError(404, 'client_not_found');

      // An admin gets real answers — they are already trusted with this data,
      // and a silent no-op would leave them re-clicking a button that works.
      const { data: authUser } = await admin.auth.admin.getUserById(profileId);
      if (authUser?.user?.email_confirmed_at) {
        await record('rejected', String(profile.email), 'already_confirmed', profileId);
        throw new HttpError(409, 'already_confirmed');
      }

      const email = String(profile.email).trim().toLowerCase();
      const { sent } = await sendConfirmation({
        email,
        fullName: String(profile.full_name ?? email),
        type: 'magiclink',
        resend: true,
      });
      // Nothing to undo — the account already existed and is unchanged.
      if (!sent) {
        await record('rejected', email, 'send_failed', profileId);
        throw new HttpError(502, 'confirmation_email_failed');
      }
      await record('sent', email, null, profileId);
      return json(req, { ok: true, email }, 200);
    }

    // ── Everything below is anonymous ───────────────────────────────────────
    const email = String(b?.email ?? '')
      .trim()
      .toLowerCase();

    if (!EMAIL_RE.test(email)) {
      await record('rejected', email || null, 'invalid_email');
      throw new HttpError(422, 'invalid:email');
    }

    // Prove a browser solved a challenge, before any throttle is consulted, any
    // account is looked up, or any mail is composed.
    //
    // `portal-sign-in` calls the resend action server-to-server with the
    // service-role key when a pending account tries to log in. That caller holds
    // a secret no browser ever sees and cannot produce a Turnstile token, so it
    // is exempt — the check it skips is one it has already surpassed.
    if (!isServiceRoleCaller(req)) {
      const captcha = await verifyCaptcha(b?.captchaToken, clientIp(req));
      if (!captcha.ok) {
        await record('rejected', email, `captcha:${captcha.reason}`);
        throw new HttpError(403, 'captcha_failed');
      }
    }

    const throttle = async (kind: 'signup' | 'resend') => {
      const { data: reason, error } = await admin.rpc('signup_throttle_active', {
        p_email: email,
        p_ip: ip,
        p_kind: kind,
      });
      if (error) throw new HttpError(500, 'signup_unavailable');
      return reason as string | null;
    };

    // ── resend ──────────────────────────────────────────────────────────────
    // Called from the "check your inbox" screen and from the sign-in form when a
    // pending account tries to log in. Answers identically whether or not the
    // address has an account, and mails only a genuinely unconfirmed one — so it
    // can neither be used to test which addresses are registered nor to fire a
    // sign-in link at somebody else's confirmed account.
    if (action === 'resend') {
      const blocked = await throttle('resend');
      if (blocked) {
        await record('blocked', email, blocked);
        // The cooldown is the one refusal safe to name: it is a property of the
        // request rate, not of the account, so it reveals nothing.
        if (blocked === 'cooldown') throw new HttpError(429, 'cooldown');
        throw new HttpError(429, 'rate_limited');
      }

      const { data: profile } = await admin
        .from('profiles')
        .select('id, email, full_name, deleted_at')
        .eq('email', email)
        .maybeSingle();

      let eligible = false;
      if (profile && !profile.deleted_at) {
        const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
        eligible = Boolean(authUser?.user) && !authUser?.user?.email_confirmed_at;
      }

      if (!eligible) {
        await record('rejected', email, 'not_pending', profile?.id ?? null);
        // Same 200 as the success path. The caller cannot tell the difference,
        // which is the entire point.
        return json(req, { ok: true }, 200);
      }

      const { sent } = await sendConfirmation({
        email,
        fullName: String(profile!.full_name ?? email),
        type: 'magiclink',
        resend: true,
      });
      if (!sent) {
        await record('rejected', email, 'send_failed', profile!.id);
        // A 502 here does confirm the address exists, since the not-eligible
        // path answers 200. That is acceptable: a send failure is an outage on
        // our side, not something an attacker can provoke on demand, and
        // swallowing it would leave a real user waiting on mail that is never
        // coming.
        throw new HttpError(502, 'confirmation_email_failed');
      }
      await record('sent', email, null, profile!.id);
      return json(req, { ok: true }, 200);
    }

    // ── signup ──────────────────────────────────────────────────────────────
    const fullName = String(b?.fullName ?? '').trim();
    const password = String(b?.password ?? '');
    const role = SELF_SERVICE_ROLES.includes(String(b?.role)) ? String(b?.role) : 'client';

    if (fullName.length < 2 || fullName.length > 120) {
      await record('rejected', email, 'invalid_full_name');
      throw new HttpError(422, 'invalid:fullName');
    }
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
      await record('rejected', email, 'invalid_password');
      throw new HttpError(422, 'invalid:password');
    }

    const blocked = await throttle('signup');
    if (blocked) {
      await record('blocked', email, blocked);
      throw new HttpError(429, blocked === 'cooldown' ? 'cooldown' : 'rate_limited');
    }

    // Checked explicitly rather than by parsing GoTrue's error text, so the
    // response does not depend on wording we do not control.
    const { data: existing, error: lookupErr } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (lookupErr) throw new HttpError(400, lookupErr.message);
    if (existing) {
      await record('rejected', email, 'email_taken', existing.id);
      throw new HttpError(409, 'email_taken');
    }

    const { userId, sent } = await sendConfirmation({
      email,
      fullName,
      type: 'signup',
      password,
      metadata: { full_name: fullName, role },
      resend: false,
    });

    // Roll the account back if the link never reached anyone.
    //
    // `generateLink` has already created the auth user by this point, so
    // leaving it would strand the caller in the worst possible place: an
    // account they cannot use, holding the only address they can register with,
    // so retrying the form answers "email taken" forever. Deleting it puts the
    // address back in their hands. Nothing is lost — the account was never
    // usable, and `handle_new_user`'s profile row cascades away with the user.
    if (!sent) {
      if (userId) {
        const { error: cleanupErr } = await admin.auth.admin.deleteUser(userId);
        if (cleanupErr) {
          console.error(
            JSON.stringify({
              level: 'error',
              message: 'signup_rollback_failed',
              detail: cleanupErr.message,
            }),
          );
        }
      }
      await record('rejected', email, 'send_failed', null);
      throw new HttpError(502, 'confirmation_email_failed');
    }

    await record('sent', email, null, userId);

    // ── Newsletter opt-in (optional, and never allowed to fail the signup) ──
    //
    // Double opt-in: public self-registration is exactly the surface somebody
    // uses to sign another person's address up, so the address itself has to
    // confirm before it counts. The subscription lands `pending` and only the
    // clicked link makes it `subscribed`.
    //
    // Kept entirely out of the success path on purpose. The account exists and
    // its confirmation email has already gone; a marketing subscription that
    // failed to record is a subscription the person can make again in one
    // click, whereas an exception here would roll a real account back over an
    // optional checkbox.
    if (b?.marketingConsent === true) {
      try {
        const { data: captured, error: consentErr } = await admin.rpc('marketing_capture_consent', {
          p_email: email,
          p_topic: 'client_updates',
          p_source: 'client_signup',
          p_consent_text: String(b?.marketingConsentText ?? MARKETING_CONSENT_FALLBACK).slice(
            0,
            500,
          ),
          p_profile_id: userId,
          p_ip: clientIp(req),
          p_user_agent: req.headers.get('user-agent'),
          p_double_opt_in: true,
        });
        if (consentErr) throw new Error(consentErr.message);

        const token = (captured as Array<{ consent_token: string | null }> | null)?.[0]
          ?.consent_token;
        if (token) {
          await sendEmail(
            confirmSubscriptionEmail({
              fullName,
              email,
              topic: 'client_updates',
              confirmUrl: confirmSubscriptionUrl(token),
              expiryDays: MARKETING_CONFIRM_EXPIRY_DAYS,
            }),
          );
        }
      } catch (e) {
        const detail = e instanceof Error ? e.message : 'unknown';
        console.error(
          JSON.stringify({ level: 'error', message: 'marketing_consent_failed', detail }),
        );
      }
    }

    return json(req, { ok: true, email }, 200);
  }),
);
