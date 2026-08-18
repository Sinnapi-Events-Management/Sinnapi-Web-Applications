// Resend driver — bulk campaign delivery over the Resend HTTP API.
//
// This is the PREFERRED campaign transport and the one the subsystem is
// designed around. `./campaignTransport.ts` chooses between it and the SMTP
// fallback in `./campaignSmtp.ts`; this file no longer decides anything beyond
// how to talk to Resend.
//
// ── Why campaigns prefer this over SMTP ────────────────────────────────────
// `_shared/email.ts` is one authenticated SMTP connection sending one message
// at a time, and it is the right tool for what it does: a password reset is a
// single message whose delivery matters more than its throughput. A campaign is
// thousands of messages that must each carry a *different* `List-Unsubscribe`
// header, be individually traceable back to a recipient row, and produce bounce
// and complaint feedback we can act on. SMTP offers batching and none of the
// rest, which is why the fallback driver is explicitly a temporary measure and
// why `newsletter-webhook` and the telemetry schema are left standing while it
// is in use.
//
// Transactional mail stays on SMTP. Nothing in this file touches it.
//
// ── The headers are the point ──────────────────────────────────────────────
// See `unsubscribeHeaders` in `./campaignMessage.ts`: RFC 8058 one-click
// opt-out, per recipient. The batch endpoint is used precisely because it takes
// per-email `headers`, so a thousand recipients get a thousand distinct
// unsubscribe URLs rather than one message with a thousand BCCs.
//
// Required env:
//   RESEND_API_KEY        — the driver reports itself unconfigured without it
//   NEWSLETTER_FROM       — e.g. "Sinnapi <news@sinnapi.com>". Must be a verified
//                           Resend domain, and deliberately a DIFFERENT subdomain
//                           from transactional mail so a bad campaign cannot
//                           damage password-reset deliverability.
// Optional env:
//   NEWSLETTER_REPLY_TO   — defaults to the support address
//   RESEND_WEBHOOK_SECRET — required only by the webhook endpoint
import { campaignReplyTo, unsubscribeHeaders } from './campaignMessage.ts';
import type { CampaignDriver, CampaignMessage, SendOutcome } from './campaignMessage.ts';

const API = 'https://api.resend.com';

/** Resend's documented ceiling for `POST /emails/batch`. */
export const MAX_BATCH = 100;

function env(key: string): string | undefined {
  return Deno.env.get(key);
}

export function resendConfigured(): boolean {
  return Boolean(env('RESEND_API_KEY') && env('NEWSLETTER_FROM'));
}

/**
 * Resend rejects a tag value containing anything but ASCII letters, numbers,
 * underscore and dash — and rejects the whole SEND, not just the tag. A subject
 * line or a campaign title routed into a tag would therefore fail the batch for
 * a reason the caller never guesses, so values are scrubbed here rather than
 * trusted.
 */
function safeTags(
  tags: Record<string, string> | undefined,
): Array<{ name: string; value: string }> {
  if (!tags) return [];
  return Object.entries(tags).map(([name, value]) => ({
    name: name.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 256),
    value: String(value)
      .replace(/[^A-Za-z0-9_-]/g, '_')
      .slice(0, 256),
  }));
}

function payloadFor(msg: CampaignMessage) {
  return {
    from: env('NEWSLETTER_FROM'),
    to: [msg.to],
    reply_to: campaignReplyTo(),
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    headers: unsubscribeHeaders(msg.unsubscribeUrl),
    tags: safeTags(msg.tags),
  };
}

/**
 * Send up to `MAX_BATCH` messages.
 *
 * Returns one outcome per input, positionally — Resend's response array is
 * documented as parallel to the request array, and the caller writes a status
 * onto a specific recipient row, so a shifted result would mark the wrong
 * person sent.
 *
 * No outcome here ever sets `permanent`. Resend accepts every syntactically
 * valid address at the API boundary and reports the bounce asynchronously, so a
 * failure at this layer is a transport problem, not a verdict on the address —
 * suppressing on it would delete reachable subscribers. Bounces reach
 * `email_suppressions` through `newsletter-webhook` instead.
 *
 * Never throws. A campaign worker that dies on a network blip leaves rows
 * leased with nobody to recover them until the lease lapses; returning a
 * per-message error lets the caller retry or dead-letter each row on its own
 * terms.
 */
async function send(messages: CampaignMessage[]): Promise<SendOutcome[]> {
  try {
    const res = await fetch(`${API}/emails/batch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages.map(payloadFor)),
    });

    const body = (await res.json().catch(() => null)) as {
      data?: Array<{ id?: string }>;
      message?: string;
      name?: string;
    } | null;

    if (!res.ok) {
      const detail = body?.message ?? body?.name ?? `http_${res.status}`;
      return messages.map(() => ({ error: detail }));
    }

    const data = body?.data ?? [];
    return messages.map((_, i) => (data[i]?.id ? { id: data[i].id } : { error: 'no_provider_id' }));
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'network_error';
    return messages.map(() => ({ error: detail }));
  }
}

export const resendDriver: CampaignDriver = {
  name: 'resend',
  maxBatch: MAX_BATCH,
  configured: resendConfigured,
  send,
};

// ───────────────────────────────────────────────────────────────────────────
// Webhook verification
// ───────────────────────────────────────────────────────────────────────────

/** Constant-time comparison — a webhook verifier that leaks timing is not one. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verify a Resend (Svix) webhook signature.
 *
 * Implemented against the Svix scheme directly rather than pulling the SDK: it
 * is an HMAC over three concatenated values, and Web Crypto does it in a dozen
 * lines with no npm shim in the Edge runtime.
 *
 * Signed content is `${id}.${timestamp}.${rawBody}`, so `rawBody` must be the
 * exact bytes received — re-serialising the parsed JSON changes key order and
 * whitespace and fails every time.
 *
 * The timestamp window is what stops a captured-and-replayed delivery report
 * from re-marking rows hours later; five minutes is Svix's own tolerance.
 */
export async function verifyResendWebhook(
  rawBody: string,
  headers: Headers,
  secret: string,
): Promise<boolean> {
  const id = headers.get('svix-id');
  const timestamp = headers.get('svix-timestamp');
  const signature = headers.get('svix-signature');
  if (!id || !timestamp || !signature || !secret) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  // Secrets are issued as `whsec_<base64>`; the bytes are what's keyed.
  const rawSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  let keyBytes: Uint8Array;
  try {
    keyBytes = Uint8Array.from(atob(rawSecret), (ch) => ch.charCodeAt(0));
  } catch {
    return false;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`),
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

  // The header may carry several space-separated `v1,<sig>` values during a
  // secret rotation; any one matching is a valid delivery.
  return signature
    .split(' ')
    .map((part) => part.split(',')[1] ?? '')
    .some((sig) => sig && timingSafeEqual(sig, expected));
}
