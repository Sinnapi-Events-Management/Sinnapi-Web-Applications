// whatsapp-webhook — public endpoint Meta calls about our WhatsApp number.
//
// GET  : the one-time subscription handshake. Meta sends `hub.verify_token`
//        (the value typed into the dashboard) and expects `hub.challenge` back.
// POST : events, each signed with the app secret (`X-Hub-Signature-256`).
//          * statuses — sent / delivered / read / failed for a message the
//            dispatcher sent; recorded on `whatsapp_messages`.
//          * messages — someone wrote to our number. STOP turns WhatsApp
//            notifications off for every profile with that phone; START turns
//            them back on. Each is confirmed with a short reply. Anything else
//            is forwarded to the support inbox email, and the sender is told
//            (once a day) to use in-app Messages — nobody reads this number.
//
// Meta retries any non-200 for up to seven days, so the response code is a
// decision: 200 = done (or nothing we can ever do), 5xx = try me again.
//
// Secrets: WHATSAPP_APP_SECRET (signature), WHATSAPP_WEBHOOK_VERIFY_TOKEN
// (handshake), plus the sender secrets for the confirmation reply.
import { handler, json } from '../_shared/http.ts';
import { adminClient, HttpError } from '../_shared/supabase.ts';
import { maskPhone, sendWhatsAppText, whatsAppConfig } from '../_shared/whatsapp.ts';
import { parseRecipients } from '../_shared/email.ts';
import { deliverEmail } from '../_shared/deliverEmail.ts';
import { parseWebhook, replyIntent, validSignature, type InboundMessage } from './parse.ts';
import { describeNonText, whatsAppReplyEmail } from './forward.ts';

/**
 * How long a `failed` callback for an id we do not know yet is worth a retry.
 * The dispatcher writes Meta's id a few milliseconds after the send returns,
 * and a fast failure callback can beat it; a retry then lands. Older than
 * this, the id is simply not ours (the smoke test, WhatsApp Manager) and
 * retrying for seven days would achieve nothing.
 */
const UNKNOWN_FAILURE_RETRY_MS = 10 * 60_000;

const AUTO_REPLY =
  'Thank you for your message. This WhatsApp number only sends Sinnapi updates, so replies here are not read in real time. We have passed your message to our support team. For the fastest answer, please use Messages in the Sinnapi app.';

const REPLY = {
  stop: 'You will no longer receive WhatsApp updates from Sinnapi. You will still get them by email and in the app. Reply START to turn WhatsApp updates back on.',
  start: 'WhatsApp updates from Sinnapi are on again. Reply STOP at any time to turn them off.',
};

Deno.serve(
  handler(async (req) => {
    if (req.method === 'GET') return verifyHandshake(req);
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed');

    const appSecret = Deno.env.get('WHATSAPP_APP_SECRET')?.trim() ?? '';
    const raw = await req.text();
    // Fails closed: without the secret nothing can be trusted, and anyone who
    // finds this URL could otherwise opt our users out or forge "delivered".
    if (!appSecret) {
      console.error(JSON.stringify({ level: 'error', message: 'whatsapp_webhook_no_app_secret' }));
      throw new HttpError(401, 'unauthorized');
    }
    if (!(await validSignature(raw, req.headers.get('x-hub-signature-256'), appSecret))) {
      throw new HttpError(401, 'bad_signature');
    }

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return json(req, { ok: true, ignored: 'not_json' }); // never valid; do not invite retries
    }

    const supa = adminClient();
    const { statuses, inbound } = parseWebhook(payload);
    let retry = false;

    for (const s of statuses) {
      const { data: known, error } = await supa.rpc('whatsapp_record_status', {
        p_message_id: s.messageId,
        p_status: s.status,
        p_at: s.at,
        p_error_code: s.errorCode,
        p_error_message: s.errorMessage,
      });
      if (error) throw new Error(`record_status_failed: ${error.message}`); // 500 → Meta retries

      if (s.status === 'failed') {
        // A failure after "sent" is the only way to learn a message never
        // arrived; log it whether or not the id is ours.
        console.error(
          JSON.stringify({
            level: 'error',
            message: 'whatsapp_delivery_failed',
            id: s.messageId,
            code: s.errorCode,
            detail: s.errorMessage,
            known,
          }),
        );
        const recent = s.at != null && Date.now() - Date.parse(s.at) < UNKNOWN_FAILURE_RETRY_MS;
        if (known === false && recent) retry = true;
      }
    }

    for (const m of inbound) {
      const intent = replyIntent(m.text);
      if (!intent) {
        await handleReply(supa, m);
        continue;
      }

      const { data: changed, error } = await supa.rpc('whatsapp_set_opt_out', {
        p_phone: m.from,
        p_opt_out: intent === 'stop',
      });
      if (error) throw new Error(`set_opt_out_failed: ${error.message}`);

      console.log(
        JSON.stringify({
          level: 'info',
          message: `whatsapp_${intent}`,
          from: maskPhone(m.from),
          profiles: changed,
        }),
      );

      // Confirm only a real change: Meta redelivers events, and a second
      // "you are unsubscribed" for the same STOP would read as a glitch. Best
      // effort — the opt-out already stands, so a failed reply is not a retry.
      const config = whatsAppConfig();
      if (config && Number(changed) > 0) {
        const sent = await sendWhatsAppText(config, m.from, REPLY[intent]);
        if (!sent.sent) {
          console.error(
            JSON.stringify({
              level: 'error',
              message: 'whatsapp_confirm_failed',
              code: sent.code,
              detail: sent.message,
            }),
          );
        }
      }
    }

    if (retry) return json(req, { ok: false, retry: 'unknown_message_id' }, 503);
    return json(req, { ok: true, statuses: statuses.length, inbound: inbound.length });
  }),
);

// ---------------------------------------------------------------------
// A reply that is not STOP/START: forward it to the support inbox, and tell
// the sender (at most once a day) that this number is not read.
//
// Idempotent under Meta's redelivery: the row is keyed by Meta's message id,
// and each of the two side effects is stamped only once it has happened. A
// redelivered event therefore finishes whatever failed and repeats nothing.
// A failed forward throws, so the webhook answers 500 and Meta retries.
// ---------------------------------------------------------------------
type Supa = ReturnType<typeof adminClient>;

async function handleReply(supa: Supa, m: InboundMessage): Promise<void> {
  const { data: profiles } = await supa
    .from('profiles')
    .select('id, full_name, email, public_id')
    .eq('phone_e164', m.from)
    .is('deleted_at', null);
  const people = profiles ?? [];

  const { data: vendors } = people.length
    ? await supa
        .from('vendors')
        .select('owner_id, business_name')
        .in(
          'owner_id',
          people.map((p) => p.id),
        )
        .is('deleted_at', null)
    : { data: [] as Array<{ owner_id: string; business_name: string | null }> };

  const { error: insertError } = await supa.from('whatsapp_inbound').upsert(
    {
      wa_message_id: m.id,
      from_phone: m.from,
      message_type: m.type,
      body: m.text,
      profile_ids: people.map((p) => p.id),
    },
    { onConflict: 'wa_message_id', ignoreDuplicates: true },
  );
  if (insertError) throw new Error(`inbound_insert_failed: ${insertError.message}`);

  const { data: row, error: readError } = await supa
    .from('whatsapp_inbound')
    .select('id, forwarded_at, auto_replied_at, received_at')
    .eq('wa_message_id', m.id)
    .single();
  if (readError || !row) throw new Error(`inbound_read_failed: ${readError?.message ?? 'no row'}`);

  // ---- 1. forward to the support inbox ----
  if (!row.forwarded_at) {
    const inbox = parseRecipients(Deno.env.get('SUPPORT_MESSAGES_INBOX'));
    if (inbox.length === 0) {
      // Same rule as the dispatcher's support copy: a missing setting is
      // logged loudly, not retried for seven days.
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'support_inbox_not_configured',
          source: 'whatsapp_reply',
        }),
      );
    } else {
      await deliverEmail(
        whatsAppReplyEmail(inbox, {
          phone: m.from,
          text: m.text ?? describeNonText(m.type),
          receivedAt: new Date(row.received_at).toLocaleString('en-GB', {
            timeZone: 'Africa/Kampala',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
          senders: people.map((p) => ({
            fullName: p.full_name ?? null,
            email: p.email ?? null,
            reference: p.public_id ?? null,
            businessName: vendors?.find((v) => v.owner_id === p.id)?.business_name ?? null,
          })),
        }),
      );
      await supa
        .from('whatsapp_inbound')
        .update({ forwarded_at: new Date().toISOString() })
        .eq('id', row.id);
    }
  }

  // ---- 2. auto-reply, at most once per 24 hours per number ----
  if (row.auto_replied_at) return;
  const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { count } = await supa
    .from('whatsapp_inbound')
    .select('id', { count: 'exact', head: true })
    .eq('from_phone', m.from)
    .gte('auto_replied_at', since);
  if ((count ?? 0) > 0) return;

  const config = whatsAppConfig();
  if (!config) return;
  // Best effort: the forward already stands, so a failed auto-reply is logged,
  // not retried.
  const sent = await sendWhatsAppText(config, m.from, AUTO_REPLY);
  if (sent.sent) {
    await supa
      .from('whatsapp_inbound')
      .update({ auto_replied_at: new Date().toISOString() })
      .eq('id', row.id);
  } else {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'whatsapp_auto_reply_failed',
        code: sent.code,
        detail: sent.message,
      }),
    );
  }
}

function verifyHandshake(req: Request): Response {
  const url = new URL(req.url);
  const expected = Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN')?.trim();
  if (
    expected &&
    url.searchParams.get('hub.mode') === 'subscribe' &&
    url.searchParams.get('hub.verify_token') === expected
  ) {
    // Plain text, exactly the challenge — Meta compares the body byte for byte.
    return new Response(url.searchParams.get('hub.challenge') ?? '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
  return new Response('forbidden', { status: 403 });
}
