// newsletter-webhook — Resend delivery telemetry.
//
// ── Why this endpoint is not optional ──────────────────────────────────────
// Without it a campaign's "sent" count is the number of messages we handed to a
// provider, which is not a number anybody should make a decision on. More
// importantly, bounces and spam complaints would never reach the suppression
// list, so every subsequent campaign would keep mailing dead addresses and
// people who have already reported us — the two behaviours that destroy a
// sending domain's reputation faster than anything else a sender can do.
//
// So the engagement stats are the visible benefit and the feedback loop is the
// real one: `email.bounced` (hard) and `email.complained` write straight
// through to `email_suppressions`, and every future audience query excludes
// them from that moment on without anybody being asked to intervene.
//
// ── Trust ──────────────────────────────────────────────────────────────────
// This is a public endpoint (`verify_jwt = false`) that mutates delivery state
// and can suppress addresses, so the Svix signature is the ONLY thing standing
// between the internet and our subscriber list. An unverifiable request is
// rejected before the body is parsed, and a missing secret fails closed: better
// to lose telemetry than to accept forged suppression.
import { handler, json } from '../_shared/http.ts';
import { adminClient, HttpError } from '../_shared/supabase.ts';
import { verifyResendWebhook } from '../_shared/resend.ts';

type Supa = ReturnType<typeof adminClient>;

type ResendEvent = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[] | string;
    bounce?: { type?: string; message?: string };
    bounce_type?: string;
    bounce_reason?: string;
    [k: string]: unknown;
  };
};

/**
 * Provider event -> the recipient column it stamps and the status it implies.
 *
 * `opened` and `clicked` do NOT overwrite a terminal status: a message can be
 * opened and later reported as spam, and a row that then reads `opened` would
 * hide the complaint. Ordering is enforced in `rankOf` rather than here.
 */
const EVENTS: Record<string, { column: string; status: string }> = {
  'email.sent': { column: 'sent_at', status: 'sent' },
  'email.delivered': { column: 'delivered_at', status: 'delivered' },
  'email.opened': { column: 'opened_at', status: 'opened' },
  'email.clicked': { column: 'clicked_at', status: 'clicked' },
  'email.bounced': { column: 'bounced_at', status: 'bounced' },
  'email.complained': { column: 'complained_at', status: 'complained' },
};

/**
 * Status precedence.
 *
 * Provider events arrive out of order — an `opened` can land after a
 * `complained` on a slow queue — so the row keeps the most consequential state
 * it has ever seen rather than the most recent one. Complaints outrank
 * everything because they are what a deliverability investigation looks for.
 */
const RANK: Record<string, number> = {
  queued: 0,
  sent: 1,
  delivered: 2,
  opened: 3,
  clicked: 4,
  skipped: 5,
  failed: 6,
  bounced: 7,
  complained: 8,
};

Deno.serve(
  handler(async (req) => {
    const secret = Deno.env.get('RESEND_WEBHOOK_SECRET');
    if (!secret) throw new HttpError(503, 'webhook_not_configured');

    // The signature covers the exact bytes received; re-serialising parsed JSON
    // changes key order and whitespace and fails verification every time.
    const raw = await req.text();
    if (!(await verifyResendWebhook(raw, req.headers, secret))) {
      throw new HttpError(401, 'invalid_signature');
    }

    let event: ResendEvent;
    try {
      event = JSON.parse(raw) as ResendEvent;
    } catch {
      throw new HttpError(400, 'invalid_json');
    }

    await ingest(adminClient(), event);

    // 200 on anything we understood, including events we chose to ignore:
    // a non-2xx puts Svix into retry, and retrying an event we will ignore
    // again just fills the provider's queue with our indifference.
    return json(req, { ok: true });
  }),
);

async function ingest(supa: Supa, event: ResendEvent) {
  const mapping = EVENTS[event.type ?? ''];
  const messageId = event.data?.email_id;
  if (!mapping || !messageId) return;

  const { data: recipient } = await supa
    .from('newsletter_recipients')
    .select('id,campaign_id,email,status')
    .eq('provider_message_id', messageId)
    .maybeSingle();

  // Not one of ours — a transactional message, or telemetry for a campaign
  // whose rows have since been deleted. Recorded without a recipient link so
  // deliverability history is not silently lost.
  const occurredAt = event.created_at ?? new Date().toISOString();

  await supa.from('newsletter_events').insert({
    campaign_id: recipient?.campaign_id ?? null,
    recipient_id: recipient?.id ?? null,
    email: recipient?.email ?? normaliseTo(event.data?.to),
    event_type: (event.type ?? '').replace(/^email\./, ''),
    payload: event.data ?? {},
    occurred_at: occurredAt,
  });

  if (!recipient) return;

  const current = RANK[recipient.status as string] ?? 0;
  const incoming = RANK[mapping.status] ?? 0;

  await supa
    .from('newsletter_recipients')
    .update({
      [mapping.column]: occurredAt,
      ...(incoming > current ? { status: mapping.status } : {}),
    })
    .eq('id', recipient.id);

  await maybeSuppress(supa, event, recipient.email as string);
}

/**
 * Feed the suppression list.
 *
 * Soft bounces are deliberately excluded: a full mailbox or a temporary server
 * failure is not a reason to stop mailing somebody forever, and treating it as
 * one quietly erodes a list that took years to build. Only a hard bounce — the
 * receiving server saying the address does not exist — and a complaint suppress.
 *
 * When the provider does not label the bounce type, it is treated as hard. That
 * is the conservative direction: the cost of dropping one reachable address is
 * far lower than the cost of hammering an invalid one every campaign.
 */
async function maybeSuppress(supa: Supa, event: ResendEvent, email: string) {
  if (event.type === 'email.complained') {
    await supa.rpc('suppress_email', {
      p_email: email,
      p_reason: 'complained',
      p_detail: 'Recipient reported the message as spam',
    });
    return;
  }

  if (event.type !== 'email.bounced') return;

  const kind = (event.data?.bounce?.type ?? event.data?.bounce_type ?? 'hard').toLowerCase();
  if (kind.includes('soft') || kind.includes('transient')) return;

  await supa.rpc('suppress_email', {
    p_email: email,
    p_reason: 'bounced',
    p_detail: event.data?.bounce?.message ?? event.data?.bounce_reason ?? 'Hard bounce',
  });
}

function normaliseTo(to: string[] | string | undefined): string | null {
  if (!to) return null;
  return Array.isArray(to) ? (to[0] ?? null) : to;
}
