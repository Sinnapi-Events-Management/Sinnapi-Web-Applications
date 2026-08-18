// newsletter-dispatch — campaign send worker (cron every minute) + test sends.
//
// ── Two callers, two authorisations ────────────────────────────────────────
//   cron / service role   `{}` or `{action:'dispatch'}` — claims due campaigns
//                         and works through their recipient rows.
//   an admin's browser    `{action:'test', campaignId, email}` — one message to
//                         one address, so a campaign can be read in a real
//                         inbox before it goes to thousands.
//
// The test path never touches recipient rows, never advances campaign status,
// and is authorised through the CALLER'S OWN client: it reads the campaign with
// their JWT, so RLS (`marketing.manage`) is what decides, not a check in this
// file that could be forgotten.
//
// ── How a send stays safe to re-enter ──────────────────────────────────────
// A cron worker gets called again while the previous call is still running, or
// after it timed out halfway. Everything here is built so that costs nothing:
//
//   * Campaigns are claimed by a conditional status flip. Two workers racing on
//     the same campaign means one `update ... where status='scheduled'` returns
//     a row and the other returns none.
//   * Recipients are claimed by LEASE, not by status: the claim pushes
//     `available_at` into the future and bumps `attempts`, so a row being sent
//     right now is invisible to the next tick, and a row whose worker died
//     becomes visible again when the lease expires. There is no state a crash
//     can leave a recipient stuck in.
//   * The lease is taken BEFORE the provider call and the result written after.
//     A crash between the two re-sends to that address once the lease lapses —
//     which is the right trade: a duplicate newsletter is an annoyance, a
//     silently skipped recipient is a campaign that lied about its reach.
//     `MAX_ATTEMPTS` bounds how often that can happen.
//   * Work per invocation is bounded (`MAX_BATCHES_PER_RUN`), so a 50,000-row
//     campaign is delivered across many ticks rather than by one call that runs
//     until the runtime kills it mid-batch.
//
// ── Consent is re-checked at send time ─────────────────────────────────────
// Suppression is verified again for every batch, not just when the campaign was
// queued. Somebody who unsubscribes between scheduling and sending must not
// receive the mail, and on a large campaign that gap is hours.
//
// ── The transport is pluggable ─────────────────────────────────────────────
// Nothing below knows whether a message left over the Resend HTTP API or an
// SMTP connection; `_shared/campaignTransport.ts` decides that from the
// environment. Two consequences show up here and nowhere else:
//
//   * The batch size is asked for rather than fixed. Resend takes 100 messages
//     per HTTP call; SMTP takes 25 real transactions, sized so a batch finishes
//     inside the recipient lease.
//   * A send-time PERMANENT refusal (an SMTP 5xx) suppresses the address here,
//     because it is the same fact `newsletter-webhook` would have delivered and
//     the webhook has no provider feeding it while SMTP is live. Resend never
//     reports permanence at send time, so on that transport this branch simply
//     never fires and the webhook keeps its job.
//   * A TRANSPORT FAULT — DNS, TLS, AUTH or missing configuration — is charged
//     to nobody. Those failures happen before the server has seen the address,
//     so the rows are returned to the queue with their attempt count refunded
//     and the run stops. Without that distinction a wrong hostname burns
//     `MAX_ATTEMPTS` in about five minutes and closes the campaign as `failed`
//     with every recipient marked undeliverable, which is a permanent, wrong
//     record of people who were in fact never contacted at all. See
//     `SendOutcome.transportFault` in `_shared/campaignMessage.ts`.
import { handler, json } from '../_shared/http.ts';
import { adminClient, userClient, isServiceRoleCaller, HttpError } from '../_shared/supabase.ts';
import { renderBlocks } from '../_shared/newsletterBlocks.ts';
import {
  sendCampaignBatch,
  sendCampaignEmail,
  campaignTransportConfigured,
  campaignTransportName,
  maxBatchSize,
} from '../_shared/campaignTransport.ts';
import { campaignMessage } from './emails.ts';

type Supa = ReturnType<typeof adminClient>;

/**
 * Batches per invocation.
 *
 * Sized against the slower transport: 5 x 25 SMTP messages is 125 real
 * connections' worth of work, which fits the Edge Function wall clock with room
 * for a slow host. On Resend the same 5 batches carry 500 messages. Either way
 * the one-minute cron picks up the rest, so this bounds a single invocation
 * rather than a campaign.
 */
const MAX_BATCHES_PER_RUN = 5;

/** Campaigns advanced per invocation — keeps one huge send from starving others. */
const MAX_CAMPAIGNS_PER_RUN = 2;

/** How long a claimed recipient stays invisible to other workers. */
const LEASE_MINUTES = 5;

/** Tries before a recipient is given up on and recorded as failed. */
const MAX_ATTEMPTS = 3;

Deno.serve(
  handler(async (req) => {
    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      campaignId?: string;
      email?: string;
    };

    if (body.action === 'preview') {
      return json(req, await preview(req, body.campaignId));
    }

    if (body.action === 'test') {
      return json(req, await sendTest(req, body.campaignId, body.email));
    }

    // Everything below moves real campaign state, so it is cron-only.
    if (!isServiceRoleCaller(req)) throw new HttpError(401, 'unauthorized');
    if (!campaignTransportConfigured()) {
      // Reported rather than thrown: a project with no transport configured
      // should log one clear line a minute, not a stack trace a minute. The
      // name is included because "not configured" is a different problem when
      // an operator has explicitly selected a transport than when none is set.
      const transport = campaignTransportName();
      console.warn(
        JSON.stringify({ level: 'warn', message: 'transport_not_configured', transport }),
      );
      return json(req, { ok: true, skipped: 'transport_not_configured', transport });
    }

    return json(req, await dispatch(adminClient()));
  }),
);

// ───────────────────────────────────────────────────────────────────────────
// Dispatch
// ───────────────────────────────────────────────────────────────────────────

type Campaign = {
  id: string;
  subject: string;
  preheader: string | null;
  audience: 'clients' | 'vendors';
  blocks: unknown;
  status: string;
};

async function dispatch(supa: Supa) {
  const campaigns = await claimCampaigns(supa);
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let bounced = 0;

  let halted: string | null = null;

  for (const campaign of campaigns) {
    const result = await runCampaign(supa, campaign);
    sent += result.sent;
    failed += result.failed;
    skipped += result.skipped;
    bounced += result.bounced;

    // A transport fault is not specific to this campaign — the next one would
    // fail on the same connection. Stopping here keeps the tick cheap and, more
    // importantly, keeps ONE cause producing ONE log line a minute instead of
    // one per campaign per batch, which is the difference between a log an
    // operator reads and a log they filter out.
    if (result.halted) {
      halted = result.halted;
      break;
    }
  }

  if (halted) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'campaign_transport_fault',
        transport: campaignTransportName(),
        detail: halted,
        // Says plainly that nothing was lost, because the obvious reading of an
        // error during a send is that recipients were dropped.
        note: 'recipients requeued with attempts refunded; sending resumes when the transport recovers',
      }),
    );
  }

  // The transport is reported on every tick, not just on error. When a campaign
  // later shows no open rate, the first question is which transport carried it,
  // and this is the only place that answer is recorded.
  //
  // `bounced` is only ever non-zero on a transport that refuses addresses
  // synchronously — which today means SMTP. On Resend the same addresses bounce
  // hours later through the webhook and never appear in a tick result.
  return {
    ok: true,
    transport: campaignTransportName(),
    campaigns: campaigns.length,
    sent,
    failed,
    skipped,
    bounced,
    ...(halted ? { halted } : {}),
  };
}

/**
 * Claim campaigns to work on.
 *
 * Two sources, in this order:
 *   `sending`   already in flight — finished first, so a large campaign is not
 *               starved by newly scheduled ones queueing in front of it.
 *   `scheduled` due now, flipped to `sending` one row at a time so a concurrent
 *               worker (or a cancel landing in the same instant) loses cleanly.
 */
async function claimCampaigns(supa: Supa): Promise<Campaign[]> {
  const claimed: Campaign[] = [];

  const { data: inFlight } = await supa
    .from('newsletter_campaigns')
    .select('id,subject,preheader,audience,blocks,status')
    .eq('status', 'sending')
    .order('started_at', { ascending: true })
    .limit(MAX_CAMPAIGNS_PER_RUN);
  claimed.push(...((inFlight ?? []) as Campaign[]));

  if (claimed.length >= MAX_CAMPAIGNS_PER_RUN) return claimed;

  const { data: due } = await supa
    .from('newsletter_campaigns')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(MAX_CAMPAIGNS_PER_RUN - claimed.length);

  for (const row of due ?? []) {
    const { data: got } = await supa
      .from('newsletter_campaigns')
      .update({ status: 'sending', started_at: new Date().toISOString(), error: null })
      .eq('id', row.id)
      .eq('status', 'scheduled')
      .select('id,subject,preheader,audience,blocks,status')
      .maybeSingle();
    if (got) claimed.push(got as Campaign);
  }

  return claimed;
}

async function runCampaign(supa: Supa, campaign: Campaign) {
  // Rendered once for the whole campaign — only the shell varies per recipient.
  const { html: bodyHtml, text: bodyText } = renderBlocks(campaign.blocks);
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let bounced = 0;
  let halted: string | null = null;

  for (let i = 0; i < MAX_BATCHES_PER_RUN; i++) {
    const batch = await claimRecipients(supa, campaign.id);
    if (batch.length === 0) {
      await finishCampaign(supa, campaign.id);
      break;
    }
    const result = await sendBatch(supa, campaign, batch, bodyHtml, bodyText);
    sent += result.sent;
    failed += result.failed;
    skipped += result.skipped;
    bounced += result.bounced;

    // The transport is down or misconfigured. The remaining batches would each
    // claim 25 more rows, fail them identically and put them straight back, so
    // continuing costs a connection timeout per message and buys nothing. The
    // campaign stays `sending` with its rows queued and untouched, and the next
    // cron tick tries one batch again — which is how it recovers by itself the
    // moment the configuration is corrected, with no operator replay step.
    if (result.halted) {
      halted = result.halted;
      break;
    }
  }

  return { sent, failed, skipped, bounced, halted };
}

type Recipient = {
  id: string;
  email: string;
  unsubscribe_token: string | null;
  attempts: number;
  /** Both copied onto the row at queue time; either may be null. */
  first_name: string | null;
  full_name: string | null;
};

/** Columns the send loop needs. Kept in one place so the claim and the re-read agree. */
const RECIPIENT_COLUMNS = 'id,email,unsubscribe_token,attempts,first_name,full_name';

/**
 * Lease the next batch.
 *
 * Read-then-update rather than a single statement because PostgREST cannot
 * express `update ... limit`. The window between the two is covered by the
 * lease itself: the update re-asserts `status = 'queued'` and
 * `available_at <= now`, so a row another worker took in between is simply not
 * returned here and this worker sends one fewer message.
 */
async function claimRecipients(supa: Supa, campaignId: string): Promise<Recipient[]> {
  const now = new Date();
  const { data: candidates } = await supa
    .from('newsletter_recipients')
    .select(RECIPIENT_COLUMNS)
    .eq('campaign_id', campaignId)
    .eq('status', 'queued')
    .lte('available_at', now.toISOString())
    .order('available_at', { ascending: true })
    // Asked of the transport rather than fixed: claiming 100 rows and handing
    // them to a driver that accepts 25 would lease 75 addresses the batch never
    // sends, leaving them invisible until the lease lapses.
    .limit(maxBatchSize());

  if (!candidates || candidates.length === 0) return [];

  const lease = new Date(now.getTime() + LEASE_MINUTES * 60_000).toISOString();
  const claimed: Recipient[] = [];

  for (const row of candidates as Recipient[]) {
    const { data: got } = await supa
      .from('newsletter_recipients')
      .update({ available_at: lease, attempts: row.attempts + 1 })
      .eq('id', row.id)
      .eq('status', 'queued')
      .lte('available_at', now.toISOString())
      .select(RECIPIENT_COLUMNS)
      .maybeSingle();
    if (got) claimed.push(got as Recipient);
  }

  return claimed;
}

async function sendBatch(
  supa: Supa,
  campaign: Campaign,
  batch: Recipient[],
  bodyHtml: string,
  bodyText: string,
) {
  let skipped = 0;

  // Re-check suppression for exactly these addresses. Cheap (one indexed IN
  // query per batch) and the only thing standing between an unsubscribe made an
  // hour ago and a message going out anyway. Under SMTP this is also what stops
  // a send-time bounce suppressing an address and the rest of the campaign
  // mailing it anyway.
  const { data: suppressed } = await supa
    .from('email_suppressions')
    .select('email')
    .in(
      'email',
      batch.map((r) => r.email),
    );
  const blocked = new Set((suppressed ?? []).map((s) => (s.email as string).toLowerCase()));

  const sendable: Recipient[] = [];
  for (const row of batch) {
    // No token means no unsubscribe link, and a marketing email without one is
    // not sendable at any price — so it is skipped rather than sent bare.
    if (blocked.has(row.email.toLowerCase()) || !row.unsubscribe_token) {
      await supa
        .from('newsletter_recipients')
        .update({
          status: 'skipped',
          error: blocked.has(row.email.toLowerCase()) ? 'suppressed' : 'no_unsubscribe_token',
        })
        .eq('id', row.id);
      skipped++;
      continue;
    }
    sendable.push(row);
  }

  if (sendable.length === 0) return { sent: 0, failed: 0, skipped, bounced: 0, halted: null };

  const outcomes = await sendCampaignBatch(
    sendable.map((r) =>
      campaignMessage({
        campaignId: campaign.id,
        subject: campaign.subject,
        preheader: campaign.preheader,
        audience: campaign.audience,
        bodyHtml,
        bodyText,
        to: r.email,
        unsubscribeToken: r.unsubscribe_token!,
        firstName: r.first_name,
        fullName: r.full_name,
      }),
    ),
  );

  let sent = 0;
  let failed = 0;
  let bounced = 0;
  // Set when the transport itself failed. Stops this run rather than working
  // through the remaining batches, all of which would fail identically.
  let halted: string | null = null;
  const nowIso = new Date().toISOString();

  for (let i = 0; i < sendable.length; i++) {
    const row = sendable[i];
    const outcome = outcomes[i] ?? { error: 'no_result' };

    if (outcome.id) {
      await supa
        .from('newsletter_recipients')
        .update({ status: 'sent', provider_message_id: outcome.id, sent_at: nowIso, error: null })
        .eq('id', row.id);
      sent++;
      continue;
    }

    // CHECKED BEFORE `permanent`, and the order is load-bearing: the permanent
    // branch calls `suppress_email`, which blocks an address from all future
    // marketing mail and is not undone by fixing the configuration. The two
    // classifications are mutually exclusive as produced today — a transport
    // fault carries no SMTP response code — but the cost of that ever ceasing to
    // hold is a silently shrinking list, so the irreversible action goes second.
    //
    // The transport never reached this address — DNS, TLS, AUTH or a missing
    // configuration failed first, and every other row in the batch carries the
    // identical outcome. The row is put back EXACTLY as it was claimed: still
    // `queued`, immediately available, and with the attempt this claim consumed
    // refunded.
    //
    // Refunding is the whole point. `MAX_ATTEMPTS` exists to stop retrying an
    // address that keeps failing on its own merits; spending it on a wrong
    // hostname or a rejected password means a misconfiguration noticed an hour
    // later finds the campaign already closed as `failed`, with every recipient
    // marked undeliverable and no record that they were never actually tried.
    // Requeueing without a refund would only postpone that by three ticks.
    //
    // The reason is still written to `error`, so the row says why it is waiting
    // and the operator has the fix in front of them on the campaign screen.
    if (outcome.transportFault) {
      await supa
        .from('newsletter_recipients')
        .update({
          status: 'queued',
          error: outcome.error ?? 'transport_unavailable',
          attempts: Math.max(0, row.attempts - 1),
          available_at: nowIso,
        })
        .eq('id', row.id);
      halted ??= outcome.error ?? 'transport_unavailable';
      continue;
    }

    // A permanent refusal is a verdict on the ADDRESS, not on this attempt.
    // Retrying it cannot succeed, and the row is recorded as `bounced` rather
    // than `failed` because that is what actually happened — `failed` means we
    // never got the message to a server at all. Suppressing here is what keeps
    // the list clean while no webhook is reporting bounces; the RPC is
    // idempotent, so a repeat costs nothing.
    if (outcome.permanent) {
      await supa
        .from('newsletter_recipients')
        .update({
          status: 'bounced',
          bounced_at: nowIso,
          error: outcome.error ?? 'rejected',
        })
        .eq('id', row.id);
      await supa.rpc('suppress_email', {
        p_email: row.email,
        p_reason: 'bounced',
        p_detail: outcome.error ?? 'Rejected at send time',
      });
      bounced++;
      continue;
    }

    const exhausted = row.attempts >= MAX_ATTEMPTS;
    await supa
      .from('newsletter_recipients')
      .update({
        status: exhausted ? 'failed' : 'queued',
        error: outcome.error ?? 'send_failed',
        // Back off linearly on retry. The common cause of a failed batch is the
        // provider rate-limiting us, and retrying immediately makes that worse.
        available_at: exhausted
          ? nowIso
          : new Date(Date.now() + 60_000 * (row.attempts + 1)).toISOString(),
      })
      .eq('id', row.id);
    if (exhausted) failed++;
  }

  return { sent, failed, skipped, bounced, halted };
}

/**
 * Close a campaign out.
 *
 * Only when nothing is left in `queued` — a leased row is still queued, so a
 * campaign whose last batch is mid-flight is not prematurely marked sent. The
 * status reflects whether every message got out: a campaign where some rows
 * exhausted their attempts is `failed` even though most of it delivered,
 * because "sent" on the list page has to mean what it says.
 */
async function finishCampaign(supa: Supa, campaignId: string) {
  const { count: remaining } = await supa
    .from('newsletter_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'queued');
  if ((remaining ?? 0) > 0) return;

  const { count: failedCount } = await supa
    .from('newsletter_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'failed');

  await supa
    .from('newsletter_campaigns')
    .update({
      status: (failedCount ?? 0) > 0 ? 'failed' : 'sent',
      completed_at: new Date().toISOString(),
      error: (failedCount ?? 0) > 0 ? `${failedCount} recipients could not be delivered` : null,
    })
    .eq('id', campaignId)
    .eq('status', 'sending');
}

// ───────────────────────────────────────────────────────────────────────────
// Preview
// ───────────────────────────────────────────────────────────────────────────

/**
 * Render a saved campaign to HTML for the composer's preview pane.
 *
 * Deliberately the same `campaignMessage` path the send loop uses. A preview
 * built by a second, browser-side renderer would be a preview of that renderer:
 * it would drift from the real output at exactly the moments that matter (a
 * block someone added, a table nesting Outlook cares about), and the operator
 * would learn about it from a recipient. Reading the campaign through the
 * caller's own client means `marketing.manage` via RLS is the authorisation.
 */
async function preview(req: Request, campaignId?: string) {
  if (!campaignId) throw new HttpError(400, 'invalid:request');

  const { data: campaign, error } = await userClient(req)
    .from('newsletter_campaigns')
    .select('id,subject,preheader,audience,blocks')
    .eq('id', campaignId)
    .maybeSingle();
  if (error || !campaign) throw new HttpError(403, 'forbidden');

  const { html, text } = renderBlocks(campaign.blocks);
  const message = campaignMessage({
    campaignId: campaign.id as string,
    subject: campaign.subject as string,
    preheader: campaign.preheader as string | null,
    audience: campaign.audience as 'clients' | 'vendors',
    bodyHtml: html,
    bodyText: text,
    to: 'preview@example.com',
    unsubscribeToken: 'preview-token',
    // A sample name rather than the fallback. The point of the preview is to
    // show the operator the shape of the personalised opening — how "Hi <name>,"
    // sits above their hero — and rendering "Hi there," would hide the one line
    // they cannot see anywhere else before the campaign goes out.
    ...PREVIEW_IDENTITY,
  });

  return { html: message.html, text: message.text, subject: message.subject };
}

/**
 * The person the preview pane is addressed to.
 *
 * A full name and its given name, so the preview exercises the real
 * `greetingLine` path rather than a special case. Deliberately obvious as a
 * sample: an operator who sees a plausible-but-unfamiliar name in their own
 * preview should read it as illustrative, not wonder who it is.
 */
const PREVIEW_IDENTITY = { firstName: 'Amina', fullName: 'Amina Nakato' } as const;

// ───────────────────────────────────────────────────────────────────────────
// Test send
// ───────────────────────────────────────────────────────────────────────────

/**
 * Send one campaign to one address.
 *
 * The test message is built through exactly the same `campaignMessage` path as
 * a real one, unsubscribe headers and all — a preview rendered by a different
 * code path tests the preview, not the campaign.
 *
 * The token is a throwaway: a test must never hand out a live unsubscribe
 * capability for somebody else's subscription, and clicking the footer link in
 * a test lands on a preference centre that simply reports an unknown token.
 *
 * The GREETING, unlike the preview's, is resolved for real. A test send exists
 * to answer "what will this actually look like in an inbox", and an operator
 * testing to their own address needs to see their own name — or, just as
 * usefully, to see "Hi there," and learn that this address would not personalise.
 *
 * The SUBJECT is sent verbatim, with no `[TEST]` marker. The whole value of this
 * path is that what lands in the operator's inbox is what lands in everybody
 * else's, and a decorated subject hides the two things a subject most needs
 * checking for: where it truncates in a mail client's list view, and how it
 * reads next to the sender name. A prefix shifts both.
 *
 * The cost is that a test is no longer distinguishable from the real campaign by
 * looking at it — only the throwaway unsubscribe token below tells them apart,
 * and that is not visible in an inbox. Nothing here can be forwarded and
 * mistaken for the genuine article by a recipient, because a test only ever goes
 * to the address an admin typed; the exposure is that an operator may not be
 * able to tell, later, whether an inbox copy came from this path or from the
 * campaign proper.
 */
async function sendTest(req: Request, campaignId?: string, email?: string) {
  if (!campaignId || !email) throw new HttpError(400, 'invalid:request');
  if (!campaignTransportConfigured()) throw new HttpError(503, 'transport_not_configured');

  // Read as the CALLER: `marketing.manage` via RLS is the authorisation.
  const { data: campaign, error } = await userClient(req)
    .from('newsletter_campaigns')
    .select('id,subject,preheader,audience,blocks')
    .eq('id', campaignId)
    .maybeSingle();
  if (error || !campaign) throw new HttpError(403, 'forbidden');

  const identity = await lookupIdentity(email);
  const { html, text } = renderBlocks(campaign.blocks);
  const outcome = await sendCampaignEmail(
    campaignMessage({
      campaignId: campaign.id as string,
      subject: campaign.subject as string,
      preheader: campaign.preheader as string | null,
      audience: campaign.audience as 'clients' | 'vendors',
      bodyHtml: html,
      bodyText: text,
      to: email,
      unsubscribeToken: 'test-preview-token',
      firstName: identity.firstName,
      fullName: identity.fullName,
    }),
  );

  // 503 when the transport itself is unusable, matching the
  // `transport_not_configured` guard above: both mean "nothing is wrong with
  // your campaign, the mail path is not working", and the composer shows the
  // detail — which for a certificate-name mismatch names the setting to change.
  // 502 stays for a genuine refusal of THIS message by a reachable server.
  if (outcome.error) throw new HttpError(outcome.transportFault ? 503 : 502, outcome.error);
  return { ok: true, id: outcome.id };
}

/**
 * The stored name for one address, for the test send's greeting.
 *
 * Uses the SERVICE-ROLE client deliberately, and this is the only place in this
 * file that reads a profile. `profiles` carries a self-read policy and nothing
 * else — an admin cannot see another person's row through RLS at all, which is
 * why every admin surface reaches profiles through SECURITY DEFINER RPCs. There
 * is no such RPC for "the display name behind this address", and adding one to
 * the public API to serve a preview would be a wider grant than this needs.
 *
 * The read is safe because of where it sits: `sendTest` has already read the
 * campaign through the CALLER'S client, so a caller without `marketing.manage`
 * was rejected before this line runs. What it returns is two name columns for
 * an address the operator typed themselves and is about to mail.
 *
 * An unknown address is not an error — most test sends go to a personal address
 * with no account, and `greetingLine` renders "Hi there," for it, which is
 * exactly what such a recipient would get in a real campaign.
 */
async function lookupIdentity(email: string) {
  const { data } = await adminClient()
    .from('profiles')
    .select('first_name,full_name')
    .eq('email', email)
    .is('deleted_at', null)
    .maybeSingle();

  return {
    firstName: (data?.first_name as string | null) ?? null,
    fullName: (data?.full_name as string | null) ?? null,
  };
}
