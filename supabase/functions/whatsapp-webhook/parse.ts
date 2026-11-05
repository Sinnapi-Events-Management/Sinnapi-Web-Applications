// Pure helpers for the WhatsApp webhook: signature check, payload parsing and
// STOP/START detection. No I/O except Web Crypto, so they are unit-testable.
//
// Payload shape (Meta "messages" field):
//   { object: 'whatsapp_business_account',
//     entry: [{ changes: [{ field: 'messages', value: {
//       statuses?: [{ id, status, timestamp, errors?: [{ code, title, message, error_data: { details } }] }],
//       messages?: [{ from, id, type, text?: { body }, button?: { text } }] } }] }] }

export interface StatusUpdate {
  messageId: string;
  status: string;
  at: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface InboundMessage {
  /** Meta's id for the message (`wamid.…`), unique — used to dedupe redelivery. */
  id: string;
  /** text, button, image, audio, video, document, sticker, location, … */
  type: string;
  /** E.164 with the plus, e.g. +256772123456. */
  from: string;
  /** The words they sent, or null for media/reactions/etc. */
  text: string | null;
}

export interface ParsedWebhook {
  statuses: StatusUpdate[];
  inbound: InboundMessage[];
}

type Json = Record<string, unknown>;
const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);
const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);

export function parseWebhook(payload: unknown): ParsedWebhook {
  const out: ParsedWebhook = { statuses: [], inbound: [] };
  const body = (payload ?? {}) as Json;
  if (body.object !== 'whatsapp_business_account') return out;

  for (const entry of arr(body.entry)) {
    for (const change of arr(entry.changes)) {
      if (change.field !== 'messages') continue;
      const value = (change.value ?? {}) as Json;

      for (const s of arr(value.statuses)) {
        const messageId = str(s.id);
        const status = str(s.status);
        if (!messageId || !status) continue;
        const err = arr(s.errors)[0];
        const seconds = Number(s.timestamp);
        out.statuses.push({
          messageId,
          status,
          at:
            Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : null,
          errorCode: err?.code != null ? String(err.code) : null,
          errorMessage: err
            ? [
                str(err.title) ?? str(err.message),
                str((err.error_data as Json | undefined)?.details),
              ]
                .filter(Boolean)
                .join(' — ') || null
            : null,
        });
      }

      for (const m of arr(value.messages)) {
        const from = str(m.from);
        const id = str(m.id);
        if (!id || !from || !/^\d{8,15}$/.test(from)) continue;
        const text =
          str((m.text as Json | undefined)?.body) ?? str((m.button as Json | undefined)?.text);
        out.inbound.push({ id, type: str(m.type) ?? 'unknown', from: `+${from}`, text });
      }
    }
  }
  return out;
}

const STOP_WORDS = new Set([
  'STOP',
  'STOPALL',
  'STOP ALL',
  'UNSUBSCRIBE',
  'CANCEL',
  'END',
  'QUIT',
  'OPT OUT',
  'OPTOUT',
]);
const START_WORDS = new Set(['START', 'UNSTOP', 'SUBSCRIBE', 'OPT IN', 'OPTIN']);

/**
 * What a reply asks for. Only the WHOLE message counts — "please don't stop
 * the booking" must not unsubscribe anyone — ignoring case, spaces and
 * trailing punctuation ("Stop." / "stop!" / " STOP ").
 */
export function replyIntent(text: string | null): 'stop' | 'start' | null {
  if (!text) return null;
  const word = text
    .trim()
    .replace(/[.!?]+$/, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
  if (STOP_WORDS.has(word)) return 'stop';
  if (START_WORDS.has(word)) return 'start';
  return null;
}

/**
 * Check Meta's `X-Hub-Signature-256` header: `sha256=` + hex HMAC-SHA256 of the
 * raw body, keyed with the app secret. Compared in constant time.
 */
export async function validSignature(
  rawBody: string,
  header: string | null,
  appSecret: string,
): Promise<boolean> {
  if (!header?.startsWith('sha256=') || !appSecret) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)),
  );
  const expected = Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('');
  const given = header.slice('sha256='.length).toLowerCase();
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}
