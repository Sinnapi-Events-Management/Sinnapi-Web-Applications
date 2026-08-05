import { supabase } from '@/lib/supabase';

/**
 * Client-side calls into the `client-sign-up` Edge Function.
 *
 * Registration deliberately does NOT go through `supabase.auth.signUp` any
 * more. That call created a fully usable account the moment the form was
 * submitted, delivered GoTrue's unbranded confirmation mail, and could not be
 * throttled from the browser in any way a bot would respect. The endpoint
 * behind these functions creates the account as `pending`, sends the branded
 * confirmation email over Sinnapi's own SMTP, and enforces the per-address and
 * per-IP caps server-side.
 */

/** Seconds the resend button stays disabled — mirrors the server's cooldown. */
export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Quoted on the confirmation screen and in the email.
 *
 * The link's real lifetime is GoTrue's "Email OTP Expiration" project setting,
 * which no application code can read — so this is a copy of it and has to be
 * kept in step (24h => 86400 in the dashboard).
 */
export const CONFIRM_LINK_EXPIRY_HOURS = 24;

const GENERIC_ERROR = 'Something went wrong. Please try again.';

/**
 * Server error codes mapped to copy.
 *
 * `email_taken` is intentionally explicit: you chose to tell people when an
 * address is already registered, so they are pointed at sign-in instead of
 * being left to wonder why nothing arrived. It is the one place in the auth
 * surface that confirms an address exists.
 */
const SIGN_UP_MESSAGES: Record<string, string> = {
  email_taken: 'An account already exists for this email. Try signing in instead.',
  'invalid:email': 'Enter a valid email address.',
  'invalid:password': 'Choose a password between 8 and 72 characters.',
  'invalid:fullName': 'Enter your full name.',
  rate_limited: 'Too many attempts from this device. Please try again in an hour.',
  cooldown: 'Please wait a moment before requesting another email.',
  // The form fetches a fresh challenge on failure, so this has to read as
  // retryable rather than final.
  captcha_failed: "We couldn't confirm you're human. Please wait a moment and try again.",
  confirmation_email_failed:
    "We couldn't send the confirmation email. Please check the address and try again.",
};

type FnResult = { ok?: boolean; email?: string };

/**
 * Pull our `{ error }` body out of a supabase-js FunctionsHttpError.
 *
 * `error.message` is the useless "Edge Function returned a non-2xx status
 * code"; the real code is in the response body, reachable only through
 * `error.context`. Same shape as the admin portal's `invokeFunction`.
 */
async function errorCode(error: unknown): Promise<string | null> {
  const context = (error as { context?: Response }).context;
  if (!context || typeof context.json !== 'function') return null;
  try {
    const payload = (await context.json()) as { error?: string };
    return payload?.error ?? null;
  } catch {
    return null;
  }
}

export type SignUpResult = { ok: true; email: string } | { ok: false; error: string };

/**
 * `captchaToken` is redeemed with Cloudflare by the endpoint before it creates
 * anything. It is what makes the per-address and per-IP caps meaningful: those
 * cost a botnet nothing on their own, since every address and every node is new.
 */
export async function signUpClient(input: {
  fullName: string;
  email: string;
  password: string;
  role: string;
  captchaToken: string;
}): Promise<SignUpResult> {
  const { data, error } = await supabase.functions.invoke<FnResult>('client-sign-up', {
    body: { action: 'signup', ...input },
  });

  if (error) {
    const code = await errorCode(error);
    return { ok: false, error: (code && SIGN_UP_MESSAGES[code]) || GENERIC_ERROR };
  }
  return { ok: true, email: data?.email ?? input.email };
}

export type ResendResult = { ok: true } | { ok: false; error: string };

/**
 * Ask for a fresh confirmation link.
 *
 * Resolves `ok` whether or not anything was actually sent — the endpoint
 * answers identically for an address with no account, so this function has no
 * way to tell and must not pretend otherwise. Only an explicit rate-limit
 * refusal comes back as an error, because that one describes the request rather
 * than the account.
 */
export async function resendConfirmation(
  email: string,
  captchaToken: string,
): Promise<ResendResult> {
  const { error } = await supabase.functions.invoke<FnResult>('client-sign-up', {
    body: { action: 'resend', email, captchaToken },
  });

  if (error) {
    const code = await errorCode(error);
    return { ok: false, error: (code && SIGN_UP_MESSAGES[code]) || GENERIC_ERROR };
  }
  return { ok: true };
}
