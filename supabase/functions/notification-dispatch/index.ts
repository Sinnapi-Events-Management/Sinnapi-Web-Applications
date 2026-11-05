// notification-dispatch — outbox consumer (cron every minute + on-demand).
//
// Two kinds of row arrive here.
//
//   Addressed rows, emitted by the money RPCs, already name one recipient and
//   their audience (client | vendor | admin) and carry the whole payload. Copy
//   comes from `notification_templates`, resolved per trigger + audience, so a
//   release approval reads as reassurance to a client and as a work item to
//   Finance.
//
//   Legacy `*_changed` rows come from the blanket table triggers still in
//   place for non-money aggregates. They keep the original projection.
//
// The previous version only ever resolved a client id out of the payload, so
// vendors and admins were never notified at all, and it used the raw trigger
// key as the in-app title.
import { handler, json } from '../_shared/http.ts';
import { adminClient, isCronCaller, HttpError } from '../_shared/supabase.ts';
import { parseRecipients } from '../_shared/email.ts';
import { deliverEmail as deliver } from '../_shared/deliverEmail.ts';
import { notificationEmail, templatedEmail, supportMessageInboxEmail, deepLink } from './emails.ts';
import {
  maskPhone,
  sendWhatsAppTemplate,
  templateParam,
  whatsAppConfig,
} from '../_shared/whatsapp.ts';

/** Legacy projection for the aggregates that still use blanket triggers. */
const LEGACY_ROUTES: Record<string, { trigger: string }> = {
  vendor_applications_changed: { trigger: 'vendor.application.status' },
  bookings_changed: { trigger: 'booking.status' },
  quotations_changed: { trigger: 'quote.status' },
  subscriptions_changed: { trigger: 'subscription.status' },
  reviews_changed: { trigger: 'review.new' },
  event_interests_changed: { trigger: 'event.interest' },
  messages_changed: { trigger: 'message.new' },
};

const BATCH = 50;
const MAX_ATTEMPTS = 5;

/**
 * The one outbox event addressed to a mailbox rather than to a profile: a
 * support message from a client or vendor, on its way to the support desk.
 * Emitted by `tg_message_notify` (see `20261011000001_support_message_email_
 * notifications.sql`).
 */
const SUPPORT_INBOX_EVENT = 'message.support_inbox';

/** `payload.channel` on outbox rows enqueued for WhatsApp rather than email. */
const WHATSAPP_CHANNEL = 'whatsapp';

type Supa = ReturnType<typeof adminClient>;
type Payload = Record<string, unknown>;

Deno.serve(
  handler(async (req) => {
    // Cron-only. The gateway does not verify a JWT here, so the handler is the
    // gate: the outbox is drained with the service-role client and every row
    // it picks up becomes an email to a real person. pg_cron presents
    // CRON_DISPATCH_SECRET as its bearer — a Sinnapi-minted secret, not the
    // project's service-role key, so it cannot go stale when Supabase
    // rotates or retires that key (see `isCronCaller`). "On-demand" means the
    // same thing: another trusted internal caller, never a browser.
    if (!isCronCaller(req)) throw new HttpError(401, 'unauthorized');

    const supa = adminClient();
    const { data: batch } = await supa
      .from('outbox')
      .select('*')
      .eq('status', 'pending')
      .lte('available_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(BATCH);

    let processed = 0;
    let failed = 0;

    for (const row of batch ?? []) {
      // Claim by flipping status; a row someone else already claimed is skipped.
      const { data: claimed } = await supa
        .from('outbox')
        .update({ status: 'processing', attempts: row.attempts + 1 })
        .eq('id', row.id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();
      if (!claimed) continue;

      try {
        const payload = (row.payload ?? {}) as Payload;

        // Checked before the addressed path, which keys on `recipient_id` +
        // `audience`: this row is addressed to a MAILBOX, not to a profile, so
        // it carries neither and would otherwise fall through to the legacy
        // projection and be silently dropped.
        // A WhatsApp row (see `enqueue_whatsapp_notification`) also carries
        // `recipient_id` + `audience`, so it MUST be routed before the
        // addressed path, which would otherwise re-send the email and write a
        // second in-app row for it.
        if (payload.channel === WHATSAPP_CHANNEL) {
          await dispatchWhatsApp(supa, row.id, row.event_type, payload);
        } else if (row.event_type === SUPPORT_INBOX_EVENT) {
          await dispatchSupportInbox(payload);
        } else if (payload.recipient_id && payload.audience) {
          await dispatchAddressed(supa, row.event_type, payload);
        } else {
          await dispatchLegacy(supa, row.event_type, payload);
        }

        await supa
          .from('outbox')
          .update({ status: 'processed', processed_at: new Date().toISOString() })
          .eq('id', row.id);
        processed++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'dispatch_error';
        const exhausted = row.attempts >= MAX_ATTEMPTS;
        // Exponential-ish backoff, then dead-letter. A dead-lettered money
        // notification is a reconciliation concern, not a silent loss.
        await supa
          .from('outbox')
          .update({
            status: exhausted ? 'failed' : 'pending',
            available_at: new Date(Date.now() + 60_000 * (row.attempts + 1)).toISOString(),
            error: msg,
          })
          .eq('id', row.id);
        if (exhausted) {
          console.error(
            JSON.stringify({
              level: 'error',
              message: 'outbox_dead_letter',
              id: row.id,
              detail: msg,
            }),
          );
        }
        failed++;
      }
    }

    return json(req, { ok: true, processed, failed });
  }),
);

// ---------------------------------------------------------------------
// Addressed dispatch — one recipient, template-driven copy.
// ---------------------------------------------------------------------
async function dispatchAddressed(supa: Supa, trigger: string, payload: Payload): Promise<void> {
  const recipientId = payload.recipient_id as string;
  const audience = payload.audience as string;

  const { data: profile } = await supa
    .from('profiles')
    .select('email, full_name, locale')
    .eq('id', recipientId)
    .maybeSingle();
  if (!profile) return; // recipient deleted between emit and dispatch

  const enriched = await enrich(supa, payload);
  const locale = profile.locale ?? 'en';

  // ---- in-app ----
  // `email_only` rows come from `tg_notification_email`, which enqueues them
  // *from* an in-app notification that already exists — the lifecycle flows
  // write their row inline so the bell, the badge and the desktop alert do not
  // wait on this cron's one-minute tick. Writing another here would show the
  // user every quotation and booking event twice.
  const emailOnly = payload.email_only === true;

  const inApp = emailOnly ? null : await resolveTemplate(supa, trigger, audience, 'in_app', locale);
  const title = render(inApp?.subject ?? humanise(trigger), enriched);
  const body = inApp?.body_template ? render(inApp.body_template, enriched) : null;

  // The mail goes before the in-app row. A failed send throws, so the outbox
  // retries the whole row; with the in-app row written first, each retry would
  // show the bell a second time.
  if (profile.email) {
    const mail = await resolveTemplate(supa, trigger, audience, 'email', locale);
    // An in-app-only trigger has no email template, and that is deliberate —
    // not every state change deserves an inbox interruption.
    if (mail) {
      // Present only on the support-desk copies, and stripped from the sender's
      // own receipt by the emitting trigger — see the `reply_to_email` note in
      // `20261011000001_support_message_email_notifications.sql`.
      const replyTo =
        typeof payload.reply_to_email === 'string' ? payload.reply_to_email : undefined;

      await deliver(
        templatedEmail({
          to: profile.email,
          subject: render(mail.subject ?? title, enriched),
          body: render(mail.body_template, enriched),
          ctaUrl: deepLink(audience, enriched),
          ctaLabel: audience === 'admin' ? 'Open in admin' : 'View details',
          // Never back at the recipient: a Reply-To equal to the To address is a
          // mail loop waiting for an autoresponder.
          ...(replyTo && replyTo !== profile.email ? { replyTo } : {}),
        }),
      );
    }
  }

  if (emailOnly) return;

  await supa.from('notifications').insert({
    recipient_id: recipientId,
    trigger_key: trigger,
    channel: 'in_app',
    title,
    body,
    data: {
      ...pickReferences(enriched),
      audience,
      url: deepLink(audience, enriched),
      // This pass owns both channels for this notification: the row above and
      // the mail sent first. `trg_notification_email` fires on the insert and
      // would otherwise enqueue a second copy of the same email, because its
      // rule is simply "an email template exists for this trigger" — and for
      // every escrow, settlement and payment-window trigger, one does.
      dispatched: true,
    },
  });
}

// ---------------------------------------------------------------------
// WhatsApp dispatch — one recipient, one approved Meta template.
//
// The row was enqueued by `enqueue_whatsapp_notification`, which already
// checked phone, opt-out and template. They are checked AGAIN here because
// up to a minute (or five retries) has passed: the person may have opted out
// or cleared their number since, and that must win.
//
// WHAT HAPPENS ON FAILURE
//   * not configured here (no secrets)  -> logged, row processed, nothing sent
//   * retryable (rate limit, outage, expired token) -> throw, outbox retries
//   * permanent (not on WhatsApp, template mismatch) -> logged on the send
//     log, row processed — five retries cannot change the answer
//
// IDEMPOTENCY
// The `whatsapp_messages` row (unique per outbox row) is written before Meta
// is called. A retry that finds it already carrying a Meta message id knows
// the previous attempt sent and only failed afterwards, so it stops there.
// ---------------------------------------------------------------------
async function dispatchWhatsApp(
  supa: Supa,
  outboxId: string,
  trigger: string,
  payload: Payload,
): Promise<void> {
  const config = whatsAppConfig();
  if (!config) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'whatsapp_not_configured',
        detail: 'WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN unset',
        outbox_id: outboxId,
      }),
    );
    return;
  }

  const recipientId = payload.recipient_id as string;
  const audience = payload.audience as string;

  const { data: profile } = await supa
    .from('profiles')
    .select('full_name, phone_e164, whatsapp_opt_out_at, locale, deleted_at')
    .eq('id', recipientId)
    .maybeSingle();
  if (!profile || profile.deleted_at || !profile.phone_e164 || profile.whatsapp_opt_out_at) return;

  const { data: template } = await supa
    .rpc('resolve_whatsapp_template', {
      p_trigger: trigger,
      p_audience: audience,
      p_locale: profile.locale ?? 'en',
    })
    .maybeSingle();
  const tpl = template as { provider_template: string; params: string[]; locale: string } | null;
  if (!tpl?.provider_template) return; // template switched off since enqueue

  // Already sent by an earlier attempt? Then this retry has nothing to do.
  const { data: prior } = await supa
    .from('whatsapp_messages')
    .select('id, provider_message_id')
    .eq('outbox_id', outboxId)
    .maybeSingle();
  if (prior?.provider_message_id) return;

  const to = profile.phone_e164 as string;
  const enriched = await enrich(supa, payload);
  // Keys every WhatsApp template may use besides the event's own payload:
  // who it is for, and where to act on it. The link goes in the message body
  // as a blank, not as a button, because Meta's URL buttons need one fixed
  // domain and the three portals live on three.
  const fullName = String(profile.full_name ?? '').trim();
  enriched.recipient_name = fullName || 'there';
  enriched.recipient_first_name = fullName.split(/\s+/)[0] || 'there';
  enriched.link = deepLink(audience, enriched);

  const bodyParams = (tpl.params ?? []).map((key) => templateParam(enriched[key]));

  const logRow = {
    outbox_id: outboxId,
    notification_id: (payload.notification_id as string | null) ?? null,
    recipient_id: recipientId,
    trigger_key: trigger,
    provider_template: tpl.provider_template,
    to_phone: to,
    status: 'sending',
    error_code: null,
    error_message: null,
    updated_at: new Date().toISOString(),
  };
  const { data: log, error: logError } = await supa
    .from('whatsapp_messages')
    .upsert(logRow, { onConflict: 'outbox_id' })
    .select('id')
    .single();
  // No log row means no idempotency guard; sending anyway risks a duplicate on
  // the next retry, so retry the whole row instead.
  if (logError || !log) throw new Error(`whatsapp_log_failed: ${logError?.message ?? 'no row'}`);

  const result = await sendWhatsAppTemplate(config, {
    to,
    template: tpl.provider_template,
    // Meta language codes are `en`, `en_US`, `fr`…; our locale column holds
    // the same short form for English, which is all that is approved today.
    language: tpl.locale || 'en',
    bodyParams,
  });

  const now = new Date().toISOString();
  if (result.sent) {
    await supa
      .from('whatsapp_messages')
      .update({
        provider_message_id: result.messageId,
        status: 'sent',
        status_at: now,
        updated_at: now,
      })
      .eq('id', log.id);
    return;
  }

  await supa
    .from('whatsapp_messages')
    .update({
      status: 'failed',
      error_code: result.code,
      error_message: result.message.slice(0, 1000),
      status_at: now,
      updated_at: now,
    })
    .eq('id', log.id);

  if (result.retryable) throw new Error(`whatsapp_${result.code}: ${result.message}`);

  console.error(
    JSON.stringify({
      level: 'error',
      message: 'whatsapp_permanent_failure',
      outbox_id: outboxId,
      trigger,
      to: maskPhone(to),
      code: result.code,
      detail: result.message,
    }),
  );
}

// ---------------------------------------------------------------------
// Support desk dispatch — one mailbox, read from a secret.
//
// WHY THE ADDRESS IS NOT IN THE DATABASE
// It is an operational routing setting, not marketplace data: it changes when
// the team's mail does, it must be changeable without a migration, and the
// rest of the outbox addresses profiles. Same shape and same reasoning as
// `VENDOR_APPLICATIONS_INBOX` in `vendor-application`, down to accepting a
// comma- or semicolon-separated list so a second mailbox can be added by
// editing one secret.
//
// UNSET IS A CONFIGURATION PROBLEM, NOT A LOST MESSAGE
// The message is already in the thread, every `moderation.manage` operator has
// an in-app notification and their own copy by mail, and the sender has their
// receipt. So an unset secret must not fail the row into the dead-letter queue
// on the fifth attempt — it is logged loudly and the row is marked processed,
// because retrying an env var that nobody has set yet is five attempts of
// nothing. A send that genuinely FAILS still throws, so the outbox retries it.
// ---------------------------------------------------------------------
async function dispatchSupportInbox(payload: Payload): Promise<void> {
  const inbox = parseRecipients(Deno.env.get('SUPPORT_MESSAGES_INBOX'));
  if (inbox.length === 0) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'support_inbox_not_configured',
        detail: 'SUPPORT_MESSAGES_INBOX is unset or holds no valid address',
        conversation_id: payload.conversation_id ?? null,
      }),
    );
    return;
  }

  const str = (key: string): string | undefined => {
    const value = payload[key];
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
  };

  await deliver(
    supportMessageInboxEmail(inbox, {
      senderName: str('sender_name') ?? 'A Sinnapi user',
      senderEmail: str('sender_email'),
      senderPhone: str('sender_phone'),
      senderReference: str('sender_reference'),
      senderKindLabel: str('sender_kind_label'),
      businessName: str('vendor_name'),
      threadSubject: str('subject'),
      // The excerpt is the fallback, not the content: a `message_body` that
      // arrived empty means an attachment-only message, and the facts and the
      // link are still worth sending.
      message: str('message_body') ?? str('excerpt') ?? '(no message body)',
      threadUrl: deepLink('admin', payload),
    }),
  );
}

// ---------------------------------------------------------------------
// Legacy dispatch — unchanged projection for non-money aggregates.
// ---------------------------------------------------------------------
async function dispatchLegacy(supa: Supa, eventType: string, payload: Payload): Promise<void> {
  const route = LEGACY_ROUTES[eventType];
  if (!route) return;

  const recipients = [payload.client_id, payload.recipient_id, payload.payer_id].filter(
    (v): v is string => typeof v === 'string' && v.length > 0,
  );

  for (const rid of new Set(recipients)) {
    await supa.from('notifications').insert({
      recipient_id: rid,
      trigger_key: route.trigger,
      channel: 'in_app',
      title: humanise(route.trigger),
      body: null,
      // Same ownership claim as the addressed path: this function sends the
      // legacy email itself, two lines down.
      data: { aggregate: eventType, id: payload.id ?? null, dispatched: true },
    });

    const { data: prof } = await supa.from('profiles').select('email').eq('id', rid).maybeSingle();
    if (prof?.email) await deliver(notificationEmail(prof.email, route.trigger));
  }
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

async function resolveTemplate(
  supa: Supa,
  trigger: string,
  audience: string,
  channel: 'in_app' | 'email',
  locale: string,
): Promise<{ subject: string | null; body_template: string } | null> {
  const { data } = await supa
    .rpc('resolve_notification_template', {
      p_trigger: trigger,
      p_audience: audience,
      p_channel: channel,
      p_locale: locale,
    })
    .maybeSingle();
  return (data as { subject: string | null; body_template: string } | null) ?? null;
}

/**
 * Add the display names and formatting the templates reference. The RPCs emit
 * ids because they run inside the money transaction and should stay cheap;
 * resolving names is the dispatcher's job.
 */
async function enrich(supa: Supa, payload: Payload): Promise<Payload> {
  const out: Payload = { ...payload };

  if (payload.vendor_id && !payload.vendor_name) {
    const { data } = await supa
      .from('vendors')
      .select('business_name')
      .eq('id', payload.vendor_id)
      .maybeSingle();
    out.vendor_name = data?.business_name ?? 'your vendor';
  }
  if (payload.client_id && !payload.client_name) {
    const { data } = await supa
      .from('profiles')
      .select('full_name')
      .eq('id', payload.client_id)
      .maybeSingle();
    out.client_name = data?.full_name ?? 'the client';
  }

  // Money reads as money, not as a raw numeric.
  for (const key of [
    'agreed_amount',
    'gross_amount',
    'advance_amount',
    'balance_amount',
    'commission_amount',
    'psp_fee_amount',
    'amount',
    'shortfall',
    // Settlement figures. `requested_amount` is what the vendor asked for,
    // `approved_amount` what the client agreed, `final_amount` what was paid
    // and `withheld_amount` what goes back — a template that prints any of
    // them raw would put `140000.00` in front of a person.
    'requested_amount',
    'approved_amount',
    'withheld_amount',
    'final_amount',
    'refunded_amount',
    // Quotation figures. `total` is what the vendor quoted and what the client
    // accepts, so it is the number most of the quote copy prints — unformatted
    // it would read as `226600.00`. Kept in step with `notify_enrich`, which
    // formats the same keys for the in-app row.
    'total',
    'subtotal',
  ]) {
    if (out[key] == null) continue;
    out[key] = formatAmount(Number(out[key]));
    // The same figure with its currency, as ONE value (`UGX 226,600`). Email
    // copy prints `{{currency}} {{total}}`, but a WhatsApp template may not
    // put two blanks side by side, so its copy uses `{{total_money}}`.
    out[`${key}_money`] = [out.currency, out[key]].filter((v) => v != null && v !== '').join(' ');
  }

  for (const key of ['advance_release_due_at', 'event_date', 'auto_release_due_at']) {
    if (out[key]) out[key] = formatDate(String(out[key]));
  }

  // A quote's validity, as a day rather than an instant: the window is two
  // weeks by default, so the hour is noise the reader has to look past. Zoned
  // to Kampala because unlike `event_date` this is a real timestamptz, and a
  // quote lapsing at 01:00 local would print as the previous day in UTC — the
  // one direction of error that makes a live quote read as already dead.
  if (out.valid_until) out.valid_until = formatZonedDate(String(out.valid_until));

  // Subscription periods. Days, zoned to Kampala for the same reason as
  // `valid_until`: a period ending at 01:00 local must not print as the day
  // before. `grace_until` is hours away and keeps the time.
  for (const key of ['period_start', 'period_end', 'trial_ends_at']) {
    if (out[key]) out[key] = formatZonedDate(String(out[key]));
  }
  if (out.grace_until) out.grace_until = formatDateTime(String(out.grace_until));
  if (out.days_left != null) out.days_left = String(Math.round(Number(out.days_left)));
  if (out.billing_cycle) out.billing_cycle = humanise(String(out.billing_cycle));
  if (out.change_kind) out.change_kind = humanise(String(out.change_kind));

  // Settlement deadlines are hours away, not days, so the date alone would be
  // useless — "respond by 18 August" when the clock runs out at 14:00 reads as
  // a whole day of slack the person does not have. The booking payment window
  // is the same shape and clamps to the event start, so a short-notice booking
  // can be due at 09:00 on a morning the bare date would render as a full day.
  for (const key of ['client_due_at', 'vendor_due_at', 'admin_due_at', 'payment_due_at']) {
    if (out[key]) out[key] = formatDateTime(String(out[key]));
  }

  // How long the client has left, as a whole number of hours. Written by the
  // reminder sweep as the mark it fired on, so it is already round — this only
  // guards a template printing `6.000000000001`.
  if (out.hours_left != null) out.hours_left = String(Math.round(Number(out.hours_left)));

  if (out.method) out.method = humanise(String(out.method));

  return out;
}

/**
 * The record ids a notification is *about*, lifted out of the payload and kept.
 *
 * The stored `data` used to be `{escrow_id, booking_id, audience, url}`, which
 * made every in-app row unable to name anything else it concerned — a
 * `message.received` row knew its conversation only for as long as this function
 * ran, and the portals could do no better than link to the inbox root. The rest
 * of the enriched payload is deliberately *not* spread in: it carries rendered
 * copy, names and money strings meant for the templates, and none of that
 * belongs in a machine-readable reference block.
 *
 * Keys absent from the payload are written as null rather than omitted, so a
 * consumer can probe a stable shape instead of guessing which producer it has.
 */
const REFERENCE_KEYS = [
  'booking_id',
  'escrow_id',
  'conversation_id',
  'quotation_id',
  'payment_id',
  'payout_id',
  'refund_id',
  'dispute_id',
  'settlement_id',
  'subscription_id',
  'review_id',
  'event_id',
  'vendor_id',
  'client_id',
] as const;

function pickReferences(payload: Payload): Payload {
  const out: Payload = {};
  for (const key of REFERENCE_KEYS) {
    const value = payload[key];
    out[key] = typeof value === 'string' && value.length > 0 ? value : null;
  }
  return out;
}

function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('en-UG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** The same, for an instant whose *day* is what matters, read in Kampala. */
function formatZonedDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', {
    timeZone: 'Africa/Kampala',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * A deadline, in the timezone the deadline is actually about.
 *
 * Recipients are in Uganda and the clocks these render are short — six hours,
 * not six days — so an instant printed in the server's UTC would be three
 * hours wrong in the direction that costs someone their window.
 */
function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-GB', {
    timeZone: 'Africa/Kampala',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Substitute `{{placeholders}}` from the payload.
 *
 * An unresolved placeholder collapses to an empty string rather than leaking
 * the token — a half-rendered `{{vendor_name}}` in a client's inbox reads as
 * broken, and templates are Support-editable so missing keys will happen.
 */
function render(template: string, payload: Payload): string {
  return template
    .replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, key: string) => {
      const value = payload[key];
      return value == null ? '' : String(value);
    })
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** `escrow.advance_settled` -> `Escrow advance settled`; `mtn_momo` -> `Mtn momo`. */
function humanise(key: string): string {
  const words = key.replace(/[._]/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
