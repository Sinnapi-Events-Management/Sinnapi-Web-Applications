// Bulk-email transport for marketing campaigns, over the Resend HTTP API.
//
// ── Why campaigns do not go through `_shared/email.ts` ─────────────────────
// That module is one authenticated SMTP connection sending one message at a
// time, and it is the right tool for what it does: a password reset is a single
// message whose delivery matters more than its throughput. A campaign is
// thousands of messages that must each carry a *different* `List-Unsubscribe`
// header, be individually traceable back to a recipient row, and produce bounce
// and complaint feedback we can act on. Pushing that through SMTP would mean
// building batching, per-message tracking and a feedback loop by hand, on a
// transport that offers none of them.
//
// Transactional mail stays on SMTP. Nothing in this file touches it.
//
// ── The headers are the point ──────────────────────────────────────────────
// `List-Unsubscribe` plus `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
// is RFC 8058. Since 2024 Google and Yahoo treat a working one-click opt-out as
// a hard requirement for bulk senders, not a nicety — mail without it gets
// throttled or binned regardless of what the footer says. It also has to be
// per-recipient, because the URL carries that subscription's token, which is
// precisely why the batch endpoint (which takes per-email `headers`) is used
// rather than one message with a thousand BCCs.
//
// Required env:
//   RESEND_API_KEY        — bulk sending is a no-op without it, reported, never thrown
//   NEWSLETTER_FROM       — e.g. "Sinnapi <news@sinnapi.com>". Must be a verified
//                           Resend domain, and deliberately a DIFFERENT subdomain
//                           from transactional mail so a bad campaign cannot
//                           damage password-reset deliverability.
// Optional env:
//   NEWSLETTER_REPLY_TO   — defaults to the support address
//   RESEND_WEBHOOK_SECRET — required only by the webhook endpoint

const API = 'https://api.resend.com';

/** Resend's documented ceiling for `POST /emails/batch`. */
export const MAX_BATCH = 100;

function env(key: string): string | undefined {
  return Deno.env.get(key);
}

export function resendConfigured(): boolean {
  return Boolean(env('RESEND_API_KEY') && env('NEWSLETTER_FROM'));
}

export interface CampaignMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Absolute https URL that unsubscribes this recipient in one POST. */
  unsubscribeUrl: string;
  /** Correlates provider events back to a campaign without a lookup table. */
  tags?: Record<string, string>;
}

export interface SendOutcome {
  /** Provider message id, present only on success. */
  id?: string;
  error?: string;
}

/**
 * Headers attached to every campaign message.
 *
 * The `mailto:` alternative is listed alongside the URL because some clients
 * (and most older ones) only honour that form, and a header offering only an
 * https target silently does nothing for them.
 */
function unsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  const support = env('NEWSLETTER_UNSUBSCRIBE_MAILTO');
  const targets = support
    ? `<${unsubscribeUrl}>, <mailto:${support}?subject=unsubscribe>`
    : `<${unsubscribeUrl}>`;
  return {
    'List-Unsubscribe': targets,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
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
    reply_to: env('NEWSLETTER_REPLY_TO') ?? 'support@sinnapi.com',
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
 * Never throws. A campaign worker that dies on a network blip leaves rows in
 * `processing` with no one to recover them; returning a per-message error lets
 * the caller retry or dead-letter each row on its own terms.
 */
export async function sendCampaignBatch(messages: CampaignMessage[]): Promise<SendOutcome[]> {
  if (messages.length === 0) return [];
  if (!resendConfigured()) {
    return messages.map(() => ({ error: 'resend_not_configured' }));
  }
  if (messages.length > MAX_BATCH) {
    // A caller-side bug, but one that would otherwise surface as a truncated
    // send that looks successful.
    return messages.map(() => ({ error: 'batch_too_large' }));
  }

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

/** Single send — used by the composer's "send a test to myself". */
export async function sendCampaignEmail(message: CampaignMessage): Promise<SendOutcome> {
  const [outcome] = await sendCampaignBatch([message]);
  return outcome ?? { error: 'no_result' };
}

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
