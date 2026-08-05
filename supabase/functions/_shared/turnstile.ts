// Cloudflare Turnstile — canonical server-side verification.
//
// WHY THIS EXISTS
// The widget in the browser proves nothing on its own. A bot that never loads
// our JavaScript can POST straight at these Edge Functions, which are public by
// necessity (`verify_jwt = false` — a visitor signing in or registering has no
// JWT yet). The token the widget produces only becomes evidence once THIS file
// has redeemed it with Cloudflare, server-side, using the secret. Every public
// endpoint that a bot could farm — sign-in attempts, account creation,
// confirmation and reset emails, vendor applications — calls `requireCaptcha`
// before doing anything else.
//
// TOKENS ARE SINGLE-USE
// Cloudflare redeems a token at the first siteverify call and answers
// `timeout-or-duplicate` for every later attempt with the same one. That is why
// verification runs FIRST in each handler (a token spent on a request that then
// failed for an unrelated reason is a token wasted) and why every browser-side
// submit path resets its widget after a refusal — see `useCaptcha`.
//
// Required env:
//   TURNSTILE_SECRET — the widget's secret from the Cloudflare dashboard.
//                      Set with: supabase secrets set TURNSTILE_SECRET=...
import { HttpError } from './supabase.ts';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** How long we wait on Cloudflare before giving up. */
const TIMEOUT_MS = 5000;

type SiteverifyResponse = {
  success: boolean;
  'error-codes'?: string[];
  action?: string;
  hostname?: string;
};

/**
 * The visitor's IP, as Supabase's gateway reports it.
 *
 * Passed to siteverify as `remoteip`, which lets Cloudflare correlate the token
 * with the address that solved it. Best-effort and non-authoritative — the
 * header is client-supplied — so a missing or forged value must never be the
 * thing a decision rests on. Cloudflare treats it as a hint, and so do we.
 */
export function clientIp(req: Request): string | undefined {
  const forwarded = req.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first || req.headers.get('cf-connecting-ip') || undefined;
}

export type CaptchaVerdict = { ok: true } | { ok: false; reason: string };

/**
 * Redeem a Turnstile token with Cloudflare.
 *
 * Fails CLOSED on every uncertainty — no token, no configured secret, a
 * network error, a non-2xx, an unparseable body. An endpoint that waves traffic
 * through whenever Cloudflare is unreachable is an endpoint a bot can open by
 * making Cloudflare unreachable.
 *
 * Returns a verdict rather than throwing so callers can log the machine-readable
 * reason while showing the visitor something that reveals nothing.
 */
export async function verifyCaptcha(
  token: string | undefined | null,
  ip?: string,
): Promise<CaptchaVerdict> {
  if (!token || typeof token !== 'string') return { ok: false, reason: 'missing-input-response' };

  const secret = Deno.env.get('TURNSTILE_SECRET');
  if (!secret) {
    // A deployment problem, not a visitor problem — loud in the logs, opaque to
    // the caller, and still a refusal.
    console.error(JSON.stringify({ level: 'error', message: 'TURNSTILE_SECRET is not set' }));
    return { ok: false, reason: 'missing-input-secret' };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);

  let result: SiteverifyResponse;
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return { ok: false, reason: `siteverify-http-${response.status}` };
    result = (await response.json()) as SiteverifyResponse;
  } catch (e) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'siteverify request failed',
        detail: e instanceof Error ? e.message : String(e),
      }),
    );
    return { ok: false, reason: 'siteverify-unreachable' };
  }

  if (!result.success) {
    return { ok: false, reason: result['error-codes']?.join(',') || 'verification-failed' };
  }
  return { ok: true };
}

/**
 * `verifyCaptcha` as a guard: verify or abort the request.
 *
 * Every refusal is one 403 `captcha_failed`, whatever went wrong. Telling a
 * caller apart — expired token versus replayed token versus wrong site key —
 * is free tuning feedback for someone building a bot against the endpoint. The
 * specific reason goes to the logs instead.
 */
export async function requireCaptcha(
  req: Request,
  token: string | undefined | null,
): Promise<void> {
  const verdict = await verifyCaptcha(token, clientIp(req));
  if (verdict.ok) return;
  console.warn(
    JSON.stringify({ level: 'warn', message: 'captcha_failed', reason: verdict.reason }),
  );
  throw new HttpError(403, 'captcha_failed');
}
