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
import { adminClient, isServiceRoleCaller, HttpError } from '../_shared/supabase.ts';
import { sendEmail, type EmailMessage } from '../_shared/email.ts';
import { notificationEmail, templatedEmail, deepLink } from './emails.ts';

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

type Supa = ReturnType<typeof adminClient>;
type Payload = Record<string, unknown>;

Deno.serve(
  handler(async (req) => {
    // Cron-only. The gateway does not verify a JWT here, so the handler is the
    // gate: the outbox is drained with the service-role client and every row
    // it picks up becomes an email to a real person. pg_cron presents the
    // service-role key as its bearer, which is what "on-demand" also means —
    // another function calling this one, never a browser.
    if (!isServiceRoleCaller(req)) throw new HttpError(401, 'unauthorized');

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

        if (payload.recipient_id && payload.audience) {
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

  let title = render(humanise(trigger), enriched);
  if (!emailOnly) {
    const inApp = await resolveTemplate(supa, trigger, audience, 'in_app', locale);
    title = render(inApp?.subject ?? humanise(trigger), enriched);
    const body = inApp?.body_template ? render(inApp.body_template, enriched) : null;

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
        // the mail below. `trg_notification_email` fires on the insert and
        // would otherwise enqueue a second copy of the same email, because its
        // rule is simply "an email template exists for this trigger" — and for
        // every escrow, settlement and payment-window trigger, one does.
        dispatched: true,
      },
    });
  }

  // ---- email ----
  if (!profile.email) return;
  const mail = await resolveTemplate(supa, trigger, audience, 'email', locale);
  // An in-app-only trigger has no email template, and that is deliberate —
  // not every state change deserves an inbox interruption.
  if (!mail) return;

  await deliver(
    templatedEmail({
      to: profile.email,
      subject: render(mail.subject ?? title, enriched),
      body: render(mail.body_template, enriched),
      ctaUrl: deepLink(audience, enriched),
      ctaLabel: audience === 'admin' ? 'Open in admin' : 'View details',
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
    if (out[key] != null) out[key] = formatAmount(Number(out[key]));
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

/**
 * Prefer the shared SMTP transport so the message gets the standard Sinnapi
 * shell with the inline (CID) brand logo, falling back to the HTTP provider
 * for environments that only have EMAIL_API_KEY. The HTTP path cannot carry an
 * inline attachment, so the logo degrades to its alt text there.
 */
async function deliver(msg: EmailMessage): Promise<void> {
  const result = await sendEmail(msg);
  if (result.sent) return;

  const key = Deno.env.get('EMAIL_API_KEY');
  if (!key) return; // no provider configured in this environment
  const res = await fetch(Deno.env.get('EMAIL_API_URL') ?? 'https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('EMAIL_FROM'),
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    }),
  });
  // Surface a provider rejection so the outbox retries instead of marking the
  // row processed with nothing delivered.
  if (!res.ok) throw new Error(`email_provider_${res.status}`);
}
