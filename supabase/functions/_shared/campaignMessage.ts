// The campaign message contract, and the parts of it that must not vary by
// transport.
//
// A leaf module by design: it imports nothing from the drivers or the selector,
// so `campaignTransport -> driver -> campaignMessage` stays a straight line.
// The drivers and the selector both need these definitions, and putting them in
// the selector would make every driver import the module that imports it.
export type TransportName = 'smtp' | 'resend';

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
  /** Provider message id (Resend) or SMTP Message-ID. Present only on success. */
  id?: string;
  error?: string;
  /**
   * The receiving side refused this address permanently — an SMTP 5.x.x, which
   * is the same fact an `email.bounced` webhook carries.
   *
   * Only ever set by a transport that can actually tell the difference. Resend
   * accepts everything at the API boundary and reports bounces asynchronously,
   * so its outcomes never set this; SMTP frequently learns it at RCPT TO. The
   * dispatcher uses it to suppress the address, which is the only route into
   * `email_suppressions` while no provider is feeding the webhook.
   */
  permanent?: boolean;
  /**
   * The send failed for a reason that has NOTHING to do with this recipient —
   * the transport could not be reached, authenticated with, or trusted.
   *
   * This is the opposite end of the scale from `permanent`, and the distinction
   * is not cosmetic: it decides whether a failure is charged to the address.
   *
   *   `permanent`      the server looked at this address and refused it.
   *                    Retrying cannot help. Suppress it.
   *   `transportFault` the server never got as far as looking at the address —
   *                    DNS, TCP, TLS or AUTH failed. EVERY address in the batch
   *                    would have failed identically, and every address in the
   *                    campaign will keep failing until an operator changes
   *                    something. Charging an attempt to the recipient here is
   *                    what turns a five-minute misconfiguration into a
   *                    campaign permanently marked `failed`, because
   *                    `MAX_ATTEMPTS` is exhausted by retries that never had a
   *                    chance of succeeding.
   *   neither          a transient, address-scoped problem (4xx greylisting,
   *                    mailbox full). Retry through the normal lease.
   *
   * The dispatcher responds by returning the rows to the queue with their
   * attempt count REFUNDED and stopping the run, so a campaign waits for the
   * fix instead of consuming itself against it.
   */
  transportFault?: boolean;
}

/**
 * What a transport has to be able to do.
 *
 * Small on purpose: everything that is not literally "hand these messages to a
 * server" — leasing, retries, suppression re-checks, campaign status — belongs
 * to the worker, and is identical whichever transport is live.
 */
export interface CampaignDriver {
  readonly name: TransportName;
  /**
   * Messages per `send` call. Resend's documented batch ceiling is 100; SMTP
   * has no batch concept at all and uses a smaller number simply to bound how
   * long one claim-send-record cycle holds its recipient lease.
   */
  readonly maxBatch: number;
  configured(): boolean;
  send(messages: CampaignMessage[]): Promise<SendOutcome[]>;
}

function env(key: string): string | undefined {
  return (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env.get(
    key,
  );
}

/**
 * Headers attached to every campaign message, whichever transport carries it.
 *
 * `List-Unsubscribe` plus `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
 * is RFC 8058. Since 2024 Google and Yahoo treat a working one-click opt-out as
 * a hard requirement for bulk senders, not a nicety — mail without it gets
 * throttled or binned regardless of what the footer says. It has to be
 * per-recipient, because the URL carries that subscription's token, which is
 * why campaign mail is sent as individual messages rather than one message with
 * a thousand BCCs.
 *
 * Shared here rather than implemented per driver so a transport swap cannot
 * quietly drop the one header the subsystem's deliverability rests on.
 */
export function unsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  const support = env('NEWSLETTER_UNSUBSCRIBE_MAILTO');
  const targets = support
    ? `<${unsubscribeUrl}>, <mailto:${support}?subject=unsubscribe>`
    : `<${unsubscribeUrl}>`;
  return {
    'List-Unsubscribe': targets,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

/** Reply-To for campaign mail, shared by both transports. */
export function campaignReplyTo(): string {
  return env('NEWSLETTER_REPLY_TO') ?? 'support@sinnapi.com';
}
