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
import { handler, json } from '../_shared/http.ts';
import { adminClient, userClient, isServiceRoleCaller, HttpError } from '../_shared/supabase.ts';
import { renderBlocks } from '../_shared/newsletterBlocks.ts';
import {
  sendCampaignBatch,
  sendCampaignEmail,
  resendConfigured,
  MAX_BATCH,
} from '../_shared/resend.ts';
import { campaignMessage } from './emails.ts';

type Supa = ReturnType<typeof adminClient>;

/** Recipients claimed per provider call. Resend's batch ceiling. */
const BATCH = MAX_BATCH;

/**
 * Batches per invocation. 5 x 100 = 500 messages, which comfortably fits the
 * Edge Function wall clock with room for a slow provider response, and the
 * one-minute cron picks the rest up.
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
    if (!resendConfigured()) {
      // Reported rather than thrown: a project without the key configured
      // should log one clear line a minute, not a stack trace a minute.
      console.warn(JSON.stringify({ level: 'warn', message: 'resend_not_configured' }));
      return json(req, { ok: true, skipped: 'resend_not_configured' });
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

  for (const campaign of campaigns) {
    const result = await runCampaign(supa, campaign);
    sent += result.sent;
    failed += result.failed;
    skipped += result.skipped;
  }

  return { ok: true, campaigns: campaigns.length, sent, failed, skipped };
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
  }

  return { sent, failed, skipped };
}

type Recipient = {
  id: string;
  email: string;
  unsubscribe_token: string | null;
  attempts: number;
};

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
    .select('id,email,unsubscribe_token,attempts')
    .eq('campaign_id', campaignId)
    .eq('status', 'queued')
    .lte('available_at', now.toISOString())
    .order('available_at', { ascending: true })
    .limit(BATCH);

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
      .select('id,email,unsubscribe_token,attempts')
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
  // query per 100) and the only thing standing between an unsubscribe made an
  // hour ago and a message going out anyway.
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

  if (sendable.length === 0) return { sent: 0, failed: 0, skipped };

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
      }),
    ),
  );

  let sent = 0;
  let failed = 0;
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

  return { sent, failed, skipped };
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
  });

  return { html: message.html, text: message.text, subject: message.subject };
}

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
 */
async function sendTest(req: Request, campaignId?: string, email?: string) {
  if (!campaignId || !email) throw new HttpError(400, 'invalid:request');
  if (!resendConfigured()) throw new HttpError(503, 'resend_not_configured');

  // Read as the CALLER: `marketing.manage` via RLS is the authorisation.
  const { data: campaign, error } = await userClient(req)
    .from('newsletter_campaigns')
    .select('id,subject,preheader,audience,blocks')
    .eq('id', campaignId)
    .maybeSingle();
  if (error || !campaign) throw new HttpError(403, 'forbidden');

  const { html, text } = renderBlocks(campaign.blocks);
  const outcome = await sendCampaignEmail(
    campaignMessage({
      campaignId: campaign.id as string,
      subject: `[TEST] ${campaign.subject as string}`,
      preheader: campaign.preheader as string | null,
      audience: campaign.audience as 'clients' | 'vendors',
      bodyHtml: html,
      bodyText: text,
      to: email,
      unsubscribeToken: 'test-preview-token',
    }),
  );

  if (outcome.error) throw new HttpError(502, outcome.error);
  return { ok: true, id: outcome.id };
}
