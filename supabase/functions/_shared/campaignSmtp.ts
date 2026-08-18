// SMTP driver for marketing campaigns — the fallback transport.
//
// ── What this is for ───────────────────────────────────────────────────────
// A stand-in for the Resend driver while that account is unavailable. It is
// deliberately the least clever thing that can correctly deliver a campaign:
// fixed, conservative limits, no tuning surface, no new tables, no new cron.
// See `./campaignTransport.ts` for how a transport is selected and what is lost
// by choosing this one.
//
// ── Why not just reuse `_shared/email.ts` ──────────────────────────────────
// That module is the transactional transport and should stay that way. Two
// differences make it the wrong tool here, and both are the kind that only show
// up once thousands of messages are in flight:
//
//   * Every campaign message needs its OWN `List-Unsubscribe` header, because
//     the URL carries that subscription's token. `sendEmail` has no header
//     surface at all, and adding one would put a per-recipient marketing
//     concern into the password-reset path.
//   * `sendEmail` opens an unpooled connection per message. A thousand
//     connect-auth-quit cycles against the same host is what gets a sender
//     rate-limited or temporarily blocked, which would take password resets
//     down with it. This driver pools and paces instead.
//
// ── Credentials ────────────────────────────────────────────────────────────
// `NEWSLETTER_SMTP_*` first, falling back to the transactional `SMTP_*`. The
// separation is not cosmetic: campaign volume and any spam complaints it earns
// should land on an account that is not the one delivering password resets. If
// only one set of credentials exists this still works — it just gives up that
// isolation, which is a deployment choice rather than something this file can
// enforce.
//
// Env (all optional; falls back to the transactional values):
//   NEWSLETTER_SMTP_HOST / _PORT / _USER / _PASS
//   NEWSLETTER_SMTP_SERVERNAME — the name the server's TLS certificate must
//                           match, when that differs from the host dialled.
//                           See `smtpServername()` below for when it is needed.
//   NEWSLETTER_SMTP_FROM  — else NEWSLETTER_FROM, else EMAIL_FROM, else the
//                           authenticated user. Accepts either a bare address
//                           or a full `Name <addr>` form.
import nodemailer from 'npm:nodemailer@6';
import { APP_NAME } from './emailTemplate.ts';
import { campaignReplyTo, unsubscribeHeaders } from './campaignMessage.ts';
import type { CampaignDriver, CampaignMessage, SendOutcome } from './campaignMessage.ts';

/**
 * Messages claimed and sent per cycle.
 *
 * Small compared with Resend's 100 because these are 25 real SMTP transactions,
 * not one HTTP call: the batch has to finish well inside the recipient lease
 * (5 minutes) so a slow host cannot cause the same addresses to be re-leased
 * and re-sent by the next tick.
 */
const MAX_BATCH = 25;

/**
 * Simultaneous connections to the mail host.
 *
 * Five is under every commodity SMTP provider's default connection cap that
 * this platform is likely to be pointed at. Being conservative costs wall-clock
 * on a large campaign — which the one-minute cron absorbs by simply running
 * again — whereas being aggressive costs a rate-limit block that also takes out
 * transactional mail if the accounts are shared.
 */
const MAX_CONNECTIONS = 5;

/** Messages per second, across all connections. Same reasoning as above. */
const MESSAGES_PER_SECOND = 10;

function env(key: string): string | undefined {
  return Deno.env.get(key);
}

/** Campaign SMTP setting, falling back to the transactional one. */
function smtpEnv(suffix: string): string | undefined {
  return env(`NEWSLETTER_SMTP_${suffix}`) ?? env(`SMTP_${suffix}`);
}

function configured(): boolean {
  return Boolean(smtpEnv('HOST') && smtpEnv('USER') && smtpEnv('PASS'));
}

/**
 * The name the server's certificate must be valid for, when that is not the
 * name we dial.
 *
 * On shared hosting those are genuinely two different facts. The address is
 * `mail.<domain>` — DNS the operator controls, stable across account moves. The
 * certificate that address serves is frequently the HOSTING PROVIDER'S own
 * wildcard for its infrastructure (`*.web-hosting.com` and nothing else), which
 * does not cover the customer's domain at all. Verification then fails with
 * `NotValidForName` and the socket is closed before AUTH is even attempted, so
 * every message in the batch dies with an `ESOCKET` that says nothing about
 * mail.
 *
 * Pointing this at a name the certificate DOES list — the shared server's own
 * hostname — makes the handshake verify that identity while still connecting to
 * `HOST`. Verification stays fully on: this chooses WHICH name is checked, it
 * does not skip the check, and a server presenting an untrusted or expired
 * chain is still refused.
 *
 * Leave it unset for any provider whose certificate covers its own hostname
 * (a dedicated relay, or a mailbox provider like Private Email). Unset pins
 * nothing, so the provider moving the account between servers cannot break the
 * send — which is the standing cost of setting it, and the reason it is an
 * override rather than the default.
 */
function smtpServername(): string | undefined {
  return smtpEnv('SERVERNAME')?.trim() || undefined;
}

// Pooled and reused across invocations warm on the same isolate. A campaign is
// delivered over many cron ticks, so a transporter that survives between them
// removes most of the connection setup from the critical path.
let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function transporter(): ReturnType<typeof nodemailer.createTransport> | null {
  if (cachedTransporter) return cachedTransporter;
  if (!configured()) return null;

  const port = Number(smtpEnv('PORT') ?? '587');
  const servername = smtpServername();
  cachedTransporter = nodemailer.createTransport({
    host: smtpEnv('HOST'),
    port,
    secure: port === 465,
    auth: { user: smtpEnv('USER')!, pass: smtpEnv('PASS')! },
    // `tls.servername` is applied only when the operator has set it, so the
    // default remains "verify against the host we dialled" — the correct
    // behaviour for every properly-certificated relay.
    //
    // `rejectUnauthorized: false` USED TO SIT HERE AND DID NOTHING. It is worth
    // recording why, because it reads like a working escape hatch and is the
    // reason a certificate-name mismatch went undiagnosed: the Edge Runtime is
    // Deno, whose TLS is rustls, and on the deployed build rustls rejects a
    // name mismatch inside the handshake and surfaces it as a socket error.
    // The Node-compatibility layer that reads `rejectUnauthorized` never gets
    // to run. So the flag bought no connectivity and cost real security —
    // anyone reading it would reasonably conclude this transport tolerated a
    // forged certificate. Naming the right certificate is both the fix that
    // works and the one that keeps the connection authenticated.
    ...(servername ? { tls: { servername } } : {}),
    pool: true,
    maxConnections: MAX_CONNECTIONS,
    // Recycle a connection after this many messages. Many hosts silently stop
    // accepting on a long-lived session, and a recycled connection is cheaper
    // than diagnosing why the tail of a campaign quietly failed.
    maxMessages: 50,
    rateDelta: 1000,
    rateLimit: MESSAGES_PER_SECOND,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    // Longer than the transactional socket timeout: a pooled connection under
    // load waits behind other messages, and a premature abort here re-sends to
    // an address that was in fact accepted.
    socketTimeout: 30_000,
  });

  return cachedTransporter;
}

/**
 * The From header.
 *
 * ── Why the display name is always applied ─────────────────────────────────
 * The brand name is what a recipient actually reads. Every mail client renders
 * the sender column from the display name and falls back to the LOCAL PART of
 * the address when there is none — so a campaign from a bare `reply@sinnapi.com`
 * arrives in the inbox list as "reply", sitting directly beneath transactional
 * mail from "Sinnapi". Same domain, same company, two different senders as far
 * as the reader is concerned, and the marketing one looks machine-generated.
 *
 * This used to pass a configured value through untouched whenever it already
 * contained a display name, on the reasoning that the operator meant it. In
 * practice that reasoning does not hold: the value is set once in an
 * environment variable, usually copied from a mailbox setup page, and whatever
 * name happens to ride along with it silently becomes the brand in every inbox.
 * The address is a routing decision and belongs in configuration; the name is a
 * branding decision and belongs with the brand. `NEWSLETTER_FROM_NAME` exists
 * for the case where they genuinely should differ.
 *
 * Only the ADDRESS is taken from the configured value, in either the bare or
 * the `Name <addr>` form, so this produces the right header no matter which
 * shape the variable was set in.
 */
function fromAddress(): string {
  const configured =
    env('NEWSLETTER_SMTP_FROM') ?? env('NEWSLETTER_FROM') ?? env('EMAIL_FROM') ?? smtpEnv('USER')!;

  // `Name <addr>` yields the address; a bare value already is one. Trimmed
  // because `supabase secrets set` preserves surrounding whitespace, and a
  // trailing newline inside a header is not a cosmetic problem — it terminates
  // the header early, and the mail client then falls back to showing the raw
  // address, which is exactly the outcome this function exists to prevent.
  const address = sanitiseHeaderValue(configured.match(/<([^>]*)>/)?.[1] ?? configured);
  const name = sanitiseHeaderValue(env('NEWSLETTER_FROM_NAME') ?? APP_NAME).replace(/"/g, '');

  return `"${name}" <${address}>`;
}

/**
 * Strip anything that would let a configured value break out of its header.
 *
 * CR and LF are the injection vector — a newline mid-value starts a new header
 * line, which is how a `From` quietly becomes an extra `Bcc`. These values come
 * from project environment variables rather than from users, so this is defence
 * in depth rather than a live hole, but a header assembled by string
 * concatenation is precisely where such holes are found later.
 */
function sanitiseHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Did the receiving side refuse this address permanently?
 *
 * SMTP says so with a 5xx reply, and that is the same fact a bounce webhook
 * would have carried — so it is the one signal that can feed
 * `email_suppressions` while no provider is reporting asynchronously.
 *
 * 4xx (mailbox full, greylisted, temporarily deferred) is explicitly NOT
 * permanent: those retry through the existing lease, and suppressing on them
 * would quietly delete reachable subscribers from the list.
 *
 * `EENVELOPE` without a numeric code means the address was rejected at
 * MAIL FROM / RCPT TO — malformed or refused — which is also terminal for this
 * address no matter how often it is retried.
 */
function isPermanent(err: unknown): boolean {
  const e = err as { responseCode?: number; code?: string } | null;
  if (!e) return false;

  // A connection-stage failure is NEVER a verdict on the recipient, whatever
  // response code rode along with it. This guard is the single most important
  // line in the file, because of what sits downstream of it: `permanent` makes
  // the dispatcher call `suppress_email`, which blocks an address from all
  // future marketing mail and is not undone by fixing the cause.
  //
  // Without it, one wrong password is a list-destroying event rather than an
  // inconvenience. `EAUTH` carries `535`; `535` is a 5xx; every recipient in
  // every batch would therefore be recorded as `bounced` and suppressed —
  // thousands of consenting subscribers deleted from reach, permanently, by a
  // typo in an environment variable, and with a stats panel reporting them as
  // undeliverable so nobody would think to look at the credentials.
  if (isTransportFault(err)) return false;

  if (typeof e.responseCode === 'number') return e.responseCode >= 500 && e.responseCode < 600;
  return e.code === 'EENVELOPE';
}

/**
 * Did we fail before the server ever considered the address?
 *
 * These are nodemailer's connection-scoped codes: DNS, TCP, TLS and AUTH. They
 * are properties of the CONFIGURATION, not of the recipient — the same failure
 * would greet every address in the campaign, and no number of retries fixes a
 * wrong hostname or a rejected password.
 *
 * The distinction earns its keep in the dispatcher, which refunds the attempt
 * and stops rather than charging a recipient for it. Without it, a
 * misconfiguration burns `MAX_ATTEMPTS` across a couple of cron ticks and
 * leaves the campaign permanently `failed` with every row marked undeliverable
 * — a data loss caused entirely by the retry policy, and one that reads on the
 * stats panel as "these people cannot receive mail" when nothing was ever wrong
 * with their addresses.
 *
 * A numeric `responseCode` means the conversation reached the SMTP protocol, so
 * whatever went wrong is about the message or the address and is deliberately
 * NOT treated as a transport fault — even for a code in this set.
 */
const TRANSPORT_FAULT_CODES = new Set([
  'ESOCKET', // TLS handshake or socket failure — including a bad certificate.
  'ECONNECTION', // Could not open or keep the connection.
  'ECONNREFUSED', // Nothing listening on that host/port.
  'EDNS', // Host does not resolve.
  'ETIMEDOUT', // Never answered.
  'EAUTH', // Credentials rejected — every message would be too.
  'ETLS', // STARTTLS upgrade refused.
]);

function isTransportFault(err: unknown): boolean {
  const e = err as { responseCode?: number; code?: string } | null;
  if (!e) return false;
  // Deliberately keyed on `code` ALONE, ignoring `responseCode`.
  //
  // An earlier version bailed out whenever a numeric response code was present,
  // reasoning that reaching the SMTP protocol at all made the failure
  // message-scoped. Authentication disproves that: a rejected password arrives
  // as `EAUTH` carrying `535`, which is both inside the protocol and about
  // nothing but the credentials. The code says which STAGE failed, which is the
  // question being asked here; the response code only says the server answered.
  return typeof e.code === 'string' && TRANSPORT_FAULT_CODES.has(e.code);
}

/**
 * Certificate-name mismatch, in whichever dialect the runtime reports it.
 *
 * Deno's rustls says `invalid peer certificate: NotValidForName`; Node's
 * OpenSSL path says `ERR_TLS_CERT_ALTNAME_INVALID` / "does not match
 * certificate's altnames". Both mean the same operator-fixable thing, and the
 * local preview script runs on Node while production runs on Deno.
 */
const TLS_NAME_MISMATCH = /NotValidForName|ALTNAME|altnames|Hostname\/IP does not match/i;

/**
 * A human-readable failure, with the fix included when we know it.
 *
 * Ordinary SMTP errors are already self-describing — `550 no such user` needs no
 * help. A certificate-name mismatch is the exception: `ESOCKET invalid peer
 * certificate: NotValidForName` names no host, no certificate and no setting,
 * and is the failure most likely to be mistaken for the mail server being down.
 * Since this string is what lands in `newsletter_recipients.error` and in the
 * admin's toast on a test send, it is the only place the operator will look.
 */
function errorDetail(err: unknown): string {
  const e = err as { responseCode?: number; code?: string; message?: string } | null;
  if (!e) return 'smtp_error';
  const message = e.message ?? 'smtp_error';

  if (TLS_NAME_MISMATCH.test(message)) {
    const host = smtpEnv('HOST') ?? 'the SMTP host';
    const servername = smtpServername();
    const current = servername ? ` (currently "${servername}")` : '';
    return (
      `smtp_tls_name_mismatch: the TLS certificate served by ${host} is not valid for ` +
      `the name it was verified against${current}. Set NEWSLETTER_SMTP_SERVERNAME to a ` +
      `hostname the certificate actually lists, or point NEWSLETTER_SMTP_HOST at a relay ` +
      `whose certificate covers its own name.`
    ).slice(0, 500);
  }

  const prefix = e.responseCode ? `${e.responseCode} ` : e.code ? `${e.code} ` : '';
  return `${prefix}${message}`.slice(0, 500);
}

async function sendOne(msg: CampaignMessage): Promise<SendOutcome> {
  const tx = transporter();
  // Missing credentials are the purest transport fault there is: nothing about
  // the recipient is at issue and no retry can help until an operator acts.
  if (!tx) return { error: 'smtp_not_configured', transportFault: true };

  try {
    const info = await tx.sendMail({
      from: fromAddress(),
      to: msg.to,
      replyTo: campaignReplyTo(),
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      headers: unsubscribeHeaders(msg.unsubscribeUrl),
      // No `attachments`: the newsletter masthead hot-links an absolute HTTPS
      // asset so that the HTML a recipient receives is byte-identical whichever
      // transport carried it. Inlining the logo by Content-ID here would render
      // better on this path and make the preview a preview of the other one.
    });

    if (info.rejected && info.rejected.length > 0) {
      // A single-recipient send that came back rejected was refused outright;
      // `rejectedErrors` carries the reply code when the server gave one.
      const first = (info as { rejectedErrors?: unknown[] }).rejectedErrors?.[0];
      return {
        error: first ? errorDetail(first) : 'rejected_by_server',
        permanent: isPermanent(first),
      };
    }
    if (!info.accepted || info.accepted.length === 0) {
      return { error: 'no_recipients_accepted' };
    }

    // The SMTP Message-ID. Nothing looks it up — the webhook only ever matches
    // Resend ids — but storing it keeps `provider_message_id` meaning "the id
    // the transport gave us", which is what makes a delivery traceable in the
    // mail host's own logs when somebody asks where a campaign went.
    const id = (info.messageId ?? '').replace(/^<|>$/g, '') || `smtp-${crypto.randomUUID()}`;
    return { id };
  } catch (err) {
    return {
      error: errorDetail(err),
      permanent: isPermanent(err),
      transportFault: isTransportFault(err),
    };
  }
}

/**
 * Send a batch, positionally.
 *
 * A fixed-size worker pool rather than `Promise.all` over the whole batch: the
 * transporter pool would queue the excess anyway, but issuing 25 sends at once
 * makes the per-message timeouts start ticking while messages sit in that
 * queue, so a slow host turns into spurious timeouts rather than a slow batch.
 *
 * Results are written into a pre-sized array by index, so the order the pool
 * happens to finish in cannot shift an outcome onto the wrong recipient row.
 */
async function send(messages: CampaignMessage[]): Promise<SendOutcome[]> {
  const outcomes = new Array<SendOutcome>(messages.length);
  let next = 0;

  // Set by the first worker to hit a connection-scoped failure. Once the
  // transport is known to be unusable the remaining messages are failed without
  // being dialled, for two reasons that both bite at batch size:
  //
  //   * Time. Each doomed attempt costs a 10s connection timeout. Twenty-five
  //     of them serialised behind five connections overruns both the Edge
  //     Function wall clock and the five-minute recipient lease — at which
  //     point the rows become claimable again mid-batch and a SECOND worker
  //     starts re-sending addresses this one is still holding.
  //   * Standing. Repeatedly hammering a host that just refused the handshake
  //     or the password is exactly the pattern that earns a temporary block,
  //     and these credentials may be shared with transactional mail.
  //
  // The recorded reason is copied from the first failure, so every row carries
  // the same actionable message rather than a generic placeholder.
  let fault: SendOutcome | null = null;

  async function worker(): Promise<void> {
    for (;;) {
      const i = next++;
      if (i >= messages.length) return;
      if (fault) {
        outcomes[i] = { ...fault };
        continue;
      }
      const outcome = await sendOne(messages[i]);
      outcomes[i] = outcome;
      if (outcome.transportFault) fault ??= outcome;
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(MAX_CONNECTIONS, messages.length) }, () => worker()),
  );

  return outcomes;
}

export const smtpCampaignDriver: CampaignDriver = {
  name: 'smtp',
  maxBatch: MAX_BATCH,
  configured,
  send,
};
