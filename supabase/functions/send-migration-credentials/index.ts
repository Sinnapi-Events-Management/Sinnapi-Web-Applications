// send-migration-credentials — one-off worker for the 2026-09 legacy import.
//
// Mails each imported client and vendor their one-time password, and records
// per recipient what happened. Service-role only; there is no user-facing path
// and no browser ever calls this.
//
// ── WHY THIS IS NOT A SCRIPT ───────────────────────────────────────────────
// 168 emails carrying live credentials is not an operation to run from a
// terminal and hope. Three things have to be true and they are why this exists
// as a function with state behind it:
//
//   * nobody is mailed twice          — a lease, claimed before the send
//   * nobody is silently skipped      — every row ends 'sent' or 'failed',
//                                       and 'failed' carries the server's words
//   * it can be re-run safely         — a second invocation picks up only what
//                                       is still pending
//
// ── THE LEASE ──────────────────────────────────────────────────────────────
// Rows are claimed by pushing `mail_leased_until` into the future and bumping
// `mail_attempts`, then sent, then recorded. A row being sent right now is
// invisible to a concurrent invocation; a row whose invocation died reappears
// when its lease lapses. Same design as `newsletter-dispatch`, for the same
// reason, and the same accepted trade: a crash between send and record
// re-sends to that address once, rather than dropping it forever.
// MAX_ATTEMPTS bounds it.
//
// ── THREE MODES, DELIBERATELY SEPARATE ─────────────────────────────────────
//   {action:'test',  email}     renders both templates to one address with a
//                               DUMMY password. Touches no row, claims no
//                               lease, reads nothing from the queue.
//   {action:'send',  only:[…]}  sends to named addresses only — the pilot.
//   {action:'send'}             works the queue, up to `limit`.
//   {action:'status'}           counts only; sends nothing.
//
// The test mode never touches real credentials on purpose: a rendering check
// should not be able to burn a real password on the wrong inbox.
//
// ── PACING ─────────────────────────────────────────────────────────────────
// The SMTP host is shared hosting, which rate-limits and suspends mailboxes
// that exceed the cap. Sends are therefore serial with a configurable gap, and
// each invocation does a bounded amount of work. Better to run this four times
// than to have the mailbox shut off at recipient 90.
//
// Env:
//   SMTP_HOST / SMTP_USER / SMTP_PASS   — see _shared/email.ts (required)
//   CLIENT_PORTAL_URL                   — client sign-in URL
//   VENDOR_PORTAL_URL                   — vendor sign-in URL
//   PUBLIC_SITE_URL                     — fallback for both
//   MIGRATION_MAIL_GAP_MS               — pause between sends (default 1500)
//   MIGRATION_MAIL_LIMIT                — max sends per invocation (default 25)
//   MIGRATION_MAIL_HOURLY_CAP           — hard ceiling per rolling hour (default 40)
import { handler, json } from '../_shared/http.ts';
import { adminClient, isServiceRoleCaller, HttpError } from '../_shared/supabase.ts';
import { sendEmail, PUBLIC_SITE_URL } from '../_shared/email.ts';
import { clientMigrationEmail, vendorMigrationEmail, type MigrationCredential } from './emails.ts';

type Action = 'test' | 'send' | 'status';

interface Body {
  action?: Action;
  /** action:'test' — the single address to render both templates to. */
  email?: string;
  /** action:'send' — restrict to these addresses (the pilot cohort). */
  only?: string[];
  /** action:'send' — override MIGRATION_MAIL_LIMIT for this invocation. */
  limit?: number;
}

interface QueueRow {
  user_id: string;
  email: string;
  legacy_kind: 'client' | 'vendor' | 'applicant';
  full_name: string | null;
  contact_full_name: string | null;
  business_name: string | null;
  temp_password: string | null;
  mail_attempts: number;
}

/** How long a claimed row stays invisible to another invocation. */
const LEASE_SECONDS = 300;

/**
 * After this many tries a row is left `failed` and stops being claimed. It
 * bounds both the crash-retry loop and a genuinely undeliverable address —
 * without it, one dead mailbox is retried until the end of time.
 */
const MAX_ATTEMPTS = 3;

const DEFAULT_GAP_MS = 1_500;

/**
 * HARD CEILING PER ROLLING HOUR.
 *
 * The SMTP host is Namecheap cPanel shared hosting (premium22.web-hosting.com),
 * which caps outbound mail PER DOMAIN PER HOUR and, in Namecheap's own words,
 * "if we find a script that is sending out more than allowed, it will be
 * disabled until you contact support". The plans are 50/hr (Stellar), 200/hr
 * (Stellar Plus) and 10,000/hr (Stellar Business).
 *
 * 40 assumes the worst case — Stellar — and deliberately leaves 10/hr of the
 * quota free, because THIS IS NOT THE ONLY THING SENDING ON THAT DOMAIN.
 * Password resets, signup confirmations and notification-dispatch all share it.
 * A migration run that consumed the entire allowance would take the platform's
 * own transactional mail down with it, and that failure would be much harder to
 * diagnose than a slow credential send.
 *
 * Raise it once you know your plan: on Stellar Plus, 150 is comfortable.
 *
 * Enforced by counting `mail_sent_at` in the trailing hour, so it holds across
 * invocations, across concurrent callers, and across a cron schedule — not just
 * within one run. It is the difference between a pacing suggestion and a limit.
 */
const DEFAULT_HOURLY_CAP = 40;

/**
 * Sends per invocation. Sized against the Edge Function wall clock, not
 * against how many are left to send.
 *
 * A request is killed at roughly 150s. Each recipient costs the gap plus a
 * real SMTP round trip on shared hosting, which is not fast:
 *
 *     25 x (1.5s gap + ~2s SMTP)  ~=  87s     comfortable
 *     40 x (1.5s gap + ~2s SMTP)  ~= 140s     inside the limit only if
 *                                             every send is quick
 *
 * The lease means a kill mid-batch is recoverable — those rows reappear in
 * five minutes — but a run that dies halfway reports numbers that understate
 * what it actually sent, and that is a confusing thing to hand somebody
 * watching a credential send. So the default leaves real headroom, and seven
 * calls is a perfectly good way to send 168 emails.
 */
const DEFAULT_LIMIT = 25;

function env(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v && v.trim() ? v.trim() : undefined;
}

const PORTAL_URL: Record<'client' | 'vendor', string> = {
  client: (env('CLIENT_PORTAL_URL') ?? PUBLIC_SITE_URL).replace(/\/$/, ''),
  vendor: (env('VENDOR_PORTAL_URL') ?? PUBLIC_SITE_URL).replace(/\/$/, ''),
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * `profiles.full_name` is the display name the import already resolved (for
 * vendors it prefers the contact person over the business). The staging
 * columns are the fallback, and the email local-part is the floor — the
 * greeting is never empty.
 */
function displayName(r: QueueRow): string {
  const pick = r.legacy_kind === 'vendor' ? r.contact_full_name : null;
  return (pick && pick.trim()) || (r.full_name && r.full_name.trim()) || r.email.split('@')[0];
}

function buildMessage(r: QueueRow, password: string) {
  const audience: 'client' | 'vendor' = r.legacy_kind === 'vendor' ? 'vendor' : 'client';
  const v: MigrationCredential = {
    fullName: displayName(r),
    email: r.email,
    tempPassword: password,
    portalUrl: PORTAL_URL[audience],
    businessName: r.business_name,
  };
  return audience === 'vendor' ? vendorMigrationEmail(v) : clientMigrationEmail(v);
}

Deno.serve(
  handler(async (req) => {
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed');

    // The only gate. This function can read 168 live passwords, so it answers
    // to the service-role key and to nothing else — not to an admin JWT, not
    // to a permission check that could be granted to the wrong role later.
    if (!isServiceRoleCaller(req)) throw new HttpError(403, 'forbidden');

    const body = ((await req.json().catch(() => ({}))) ?? {}) as Body;
    const action: Action = body.action ?? 'status';
    const admin = adminClient();

    // ── status ────────────────────────────────────────────────────────────
    if (action === 'status') {
      const { data, error } = await admin
        .from('migration_legacy_users')
        .select('mail_status, legacy_kind, mail_error')
        .eq('import_status', 'imported');
      if (error) throw new HttpError(400, error.message);

      const rows = data ?? [];
      const by = (s: string | null) => rows.filter((r) => r.mail_status === s).length;
      return json(req, {
        queued: by('pending'),
        sent: by('sent'),
        failed: by('failed'),
        not_queued: by(null),
        failures: rows
          .filter((r) => r.mail_status === 'failed')
          .map((r) => r.mail_error)
          .slice(0, 20),
        hourlyCap: Math.max(1, Number(env('MIGRATION_MAIL_HOURLY_CAP') ?? DEFAULT_HOURLY_CAP)),
        portals: PORTAL_URL,
      });
    }

    // ── test ──────────────────────────────────────────────────────────────
    // Both templates, one address, a password that is obviously not real.
    // Nothing is read from or written to the queue.
    if (action === 'test') {
      const to = body.email?.trim();
      if (!to) throw new HttpError(422, 'invalid:email');

      const fake = 'Example-Not-A-Real-Pw9';
      const sample: QueueRow = {
        user_id: '00000000-0000-0000-0000-000000000000',
        email: to,
        legacy_kind: 'client',
        full_name: 'Sample Recipient',
        contact_full_name: null,
        business_name: 'Sample Events Ltd',
        temp_password: fake,
        mail_attempts: 0,
      };

      const clientMsg = buildMessage({ ...sample, legacy_kind: 'client' }, fake);
      const vendorMsg = buildMessage(
        { ...sample, legacy_kind: 'vendor', contact_full_name: 'Sample Recipient' },
        fake,
      );

      const a = await sendEmail({ ...clientMsg, subject: `[TEST] ${clientMsg.subject}` });
      await sleep(Number(env('MIGRATION_MAIL_GAP_MS') ?? DEFAULT_GAP_MS));
      const b = await sendEmail({ ...vendorMsg, subject: `[TEST] ${vendorMsg.subject}` });

      return json(req, {
        mode: 'test',
        to,
        clientTemplate: a,
        vendorTemplate: b,
        portals: PORTAL_URL,
        note: 'Dummy password. No queue row was read or written.',
      });
    }

    // ── send ──────────────────────────────────────────────────────────────
    const gapMs = Number(env('MIGRATION_MAIL_GAP_MS') ?? DEFAULT_GAP_MS);
    const limit = Math.max(
      1,
      Math.min(200, body.limit ?? Number(env('MIGRATION_MAIL_LIMIT') ?? DEFAULT_LIMIT)),
    );
    const only = body.only?.map((e) => e.trim().toLowerCase()).filter(Boolean);

    // ── The hourly quota, checked before anything is claimed ──────────────
    // Counted from the database rather than held in memory, so it survives a
    // cold start and is not fooled by two callers running at once.
    const hourlyCap = Math.max(1, Number(env('MIGRATION_MAIL_HOURLY_CAP') ?? DEFAULT_HOURLY_CAP));
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const { count: sentLastHour } = await admin
      .from('migration_legacy_users')
      .select('user_id', { count: 'exact', head: true })
      .eq('mail_status', 'sent')
      .gte('mail_sent_at', hourAgo);

    const headroom = hourlyCap - (sentLastHour ?? 0);
    if (headroom <= 0) {
      // `remaining` is reported here too, and that is not cosmetic. A caller
      // draining the queue in a loop decides whether to keep going from this
      // field; a throttled reply that omitted it read as a malformed response
      // to the first such loop that met one. Every exit from this branch of
      // the handler now answers the same question: how many are left?
      const { count: stillPending } = await admin
        .from('migration_legacy_users')
        .select('user_id', { count: 'exact', head: true })
        .eq('mail_status', 'pending');

      // Not an error: the caller did nothing wrong and should simply come back
      // later. Returning 200 also keeps a cron schedule from logging failures
      // every time it hits the ceiling.
      return json(req, {
        mode: 'send',
        claimed: 0,
        sent: 0,
        failed: 0,
        throttled: true,
        remaining: stillPending ?? null,
        sentLastHour: sentLastHour ?? 0,
        hourlyCap,
        note: `hourly cap reached — ${sentLastHour} sent in the last hour. Try again later.`,
      });
    }

    // The batch is whichever is smaller: what this invocation may do, and what
    // the hour has left.
    const effectiveLimit = Math.min(limit, headroom);

    // Find claimable rows: pending, not currently leased, not exhausted.
    let q = admin
      .from('migration_legacy_users')
      .select(
        'user_id, email, legacy_kind, full_name, contact_full_name, business_name, temp_password, mail_attempts',
      )
      .eq('mail_status', 'pending')
      .lt('mail_attempts', MAX_ATTEMPTS)
      // The timestamp is double-quoted: inside an `or` group PostgREST splits
      // each condition on dots, and an ISO 8601 value is full of them. Quoting
      // makes the value opaque to that split instead of relying on it stopping
      // after the operator.
      .or(`mail_leased_until.is.null,mail_leased_until.lt."${new Date().toISOString()}"`)
      .order('legacy_kind', { ascending: true })
      .order('email', { ascending: true })
      .limit(effectiveLimit);

    if (only?.length) q = q.in('email', only);

    const { data: candidates, error: readErr } = await q;
    if (readErr) throw new HttpError(400, readErr.message);

    const rows = (candidates ?? []) as QueueRow[];
    if (rows.length === 0) {
      return json(req, { mode: 'send', claimed: 0, sent: 0, failed: 0, note: 'nothing to send' });
    }

    // Claim them. The lease goes on BEFORE any SMTP call, so a second
    // invocation starting now sees none of these.
    const leaseUntil = new Date(Date.now() + LEASE_SECONDS * 1000).toISOString();
    const claimed: QueueRow[] = [];
    for (const r of rows) {
      const { data: got, error: claimErr } = await admin
        .from('migration_legacy_users')
        .update({ mail_leased_until: leaseUntil, mail_attempts: r.mail_attempts + 1 })
        .eq('user_id', r.user_id)
        .eq('mail_status', 'pending')
        .or(`mail_leased_until.is.null,mail_leased_until.lt."${new Date().toISOString()}"`)
        .select('user_id')
        .maybeSingle();
      // No row back means another invocation won the race. Leave it alone.
      if (!claimErr && got) claimed.push(r);
    }

    let sent = 0;
    let failed = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (const r of claimed) {
      // A queued row with no password cannot be mailed and will never become
      // sendable, so it is recorded as failed rather than retried twice more.
      if (!r.temp_password) {
        await admin
          .from('migration_legacy_users')
          .update({
            mail_status: 'failed',
            mail_error: 'no temp_password on the row — nothing to send',
            mail_leased_until: null,
            mail_attempts: MAX_ATTEMPTS,
          })
          .eq('user_id', r.user_id);
        failed += 1;
        errors.push({ email: r.email, error: 'no temp_password' });
        continue;
      }

      const msg = buildMessage(r, r.temp_password);
      const result = await sendEmail({ ...msg, replyTo: 'support@sinnapi.com' });

      if (result.sent) {
        await admin
          .from('migration_legacy_users')
          .update({
            mail_status: 'sent',
            mail_sent_at: new Date().toISOString(),
            mail_error: null,
            mail_leased_until: null,
          })
          .eq('user_id', r.user_id);
        sent += 1;
      } else {
        const exhausted = r.mail_attempts + 1 >= MAX_ATTEMPTS;
        await admin
          .from('migration_legacy_users')
          .update({
            // Below MAX_ATTEMPTS it goes back to 'pending' so the next
            // invocation retries it; at the cap it stops, so one dead mailbox
            // does not consume every future run.
            mail_status: exhausted ? 'failed' : 'pending',
            mail_error: result.error ?? 'unknown SMTP failure',
            mail_leased_until: null,
          })
          .eq('user_id', r.user_id);
        failed += 1;
        errors.push({ email: r.email, error: result.error ?? 'unknown' });

        // A transport fault — bad host, TLS, AUTH, missing config — is not
        // about this recipient and will hit every remaining one identically.
        // Stopping leaves the rest pending instead of burning all their
        // attempts in a single doomed loop.
        if (
          /not configured|ECONNREFUSED|ENOTFOUND|EAUTH|certificate|authentication/i.test(
            result.error ?? '',
          )
        ) {
          console.error('[MIGRATION-MAIL] transport fault — stopping this run:', result.error);
          break;
        }
      }

      if (gapMs > 0) await sleep(gapMs);
    }

    // What is still outstanding, so the caller knows whether to run again.
    const { count: remaining } = await admin
      .from('migration_legacy_users')
      .select('user_id', { count: 'exact', head: true })
      .eq('mail_status', 'pending');

    return json(req, {
      mode: 'send',
      claimed: claimed.length,
      sent,
      failed,
      remaining: remaining ?? null,
      hourlyCap,
      sentLastHour: (sentLastHour ?? 0) + sent,
      errors: errors.slice(0, 20),
      portals: PORTAL_URL,
    });
  }),
);
