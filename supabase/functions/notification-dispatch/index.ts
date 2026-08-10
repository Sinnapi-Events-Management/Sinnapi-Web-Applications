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
import { adminClient } from '../_shared/supabase.ts';
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
  const inApp = await resolveTemplate(supa, trigger, audience, 'in_app', locale);
  const title = render(inApp?.subject ?? humanise(trigger), enriched);
  const body = inApp?.body_template ? render(inApp.body_template, enriched) : null;

  await supa.from('notifications').insert({
    recipient_id: recipientId,
    trigger_key: trigger,
    channel: 'in_app',
    title,
    body,
    data: {
      escrow_id: enriched.escrow_id ?? null,
      booking_id: enriched.booking_id ?? null,
      audience,
      url: deepLink(audience, enriched),
    },
  });

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
      data: { aggregate: eventType, id: payload.id ?? null },
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
  ]) {
    if (out[key] != null) out[key] = formatAmount(Number(out[key]));
  }

  for (const key of ['advance_release_due_at', 'event_date', 'auto_release_due_at']) {
    if (out[key]) out[key] = formatDate(String(out[key]));
  }

  if (out.method) out.method = humanise(String(out.method));

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
