// WhatsApp — send one approved template through the Meta WhatsApp Cloud API.
//
// Meta only delivers a business-initiated message as a PRE-APPROVED template:
// a fixed sentence with numbered blanks ({{1}}, {{2}}, …) that we fill. There
// is no free text here by design. See docs/whatsapp-notifications.md.
//
// Configuration (edge function secrets):
//   WHATSAPP_PHONE_NUMBER_ID  the sender's "Phone number ID" (not the number)
//   WHATSAPP_ACCESS_TOKEN     System User token (or the 24h test token in dev)
//   WHATSAPP_API_VERSION      Graph API version, e.g. v23.0
//
// I/O lives in `sendWhatsAppTemplate` only; everything else is pure, so the
// dispatcher can decide what a failure means without parsing HTTP itself.

const DEFAULT_API_VERSION = 'v23.0';

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion: string;
}

/** The configured sender, or null when WhatsApp is not set up here. */
export function whatsAppConfig(): WhatsAppConfig | null {
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')?.trim();
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')?.trim();
  if (!phoneNumberId || !accessToken) return null;
  return {
    phoneNumberId,
    accessToken,
    apiVersion: Deno.env.get('WHATSAPP_API_VERSION')?.trim() || DEFAULT_API_VERSION,
  };
}

/** `+256 772-123 456` → `+256772123456`: strip the spacing people type. Not a country guess. */
export function normalisePhone(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .replace(/[\s().-]/g, '');
}

/** E.164: `+`, then 8–15 digits not starting with 0. Same rule as `profiles.phone_e164`. */
export function isE164(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

/**
 * Make one value safe to put in a template blank.
 *
 * Meta rejects the WHOLE message (error 132000-range) when a parameter is
 * empty, contains a newline or tab, or has more than four spaces in a row —
 * and a payload value can be any of those (an empty vendor name, a chat
 * excerpt with line breaks). So it is flattened rather than trusted, and an
 * empty value becomes a dash instead of failing the send.
 */
export function templateParam(value: unknown, maxLength = 300): string {
  const text = String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
  if (!text) return '-';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

export interface WhatsAppTemplateMessage {
  /** E.164, e.g. +256772123456. */
  to: string;
  /** The approved Meta template name, e.g. quotation_requested_vendor. */
  template: string;
  /** The language the template was approved in: `en`, `en_US`, … */
  language: string;
  /** Values for {{1}}, {{2}}, … in order. Already passed through `templateParam`. */
  bodyParams: string[];
}

export type WhatsAppResult =
  | { sent: true; messageId: string }
  | {
      sent: false;
      /** True when trying again later can work (rate limit, Meta outage, expired token). */
      retryable: boolean;
      code: string;
      message: string;
    };

/**
 * Meta error codes where a retry can NEVER succeed: the number is not on
 * WhatsApp, the template does not exist or its blanks do not match, the
 * recipient is not on the test number's allowed list. Retrying these only
 * burns the outbox's five attempts and dead-letters the row for no reason.
 *
 * Everything else — rate limits (130429, 131056), "something went wrong"
 * (131000), service unavailable (131016), an expired token (190), network
 * errors and 5xx — is treated as retryable.
 *
 * https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
 */
const PERMANENT_CODES = new Set([
  '100', // invalid parameter
  '131008', // required parameter missing
  '131009', // parameter value invalid
  '131021', // sender and recipient are the same number
  '131026', // message undeliverable (number not on WhatsApp, old app, …)
  '131030', // recipient not in the test number's allowed list
  '131047', // free text outside the 24-hour window
  '131050', // recipient stopped marketing messages
  '131051', // unsupported message type
  '132000', // template parameter count mismatch
  '132001', // template does not exist (in this language)
  '132005', // template text too long after filling
  '132007', // template format character policy violated
  '132012', // template parameter format mismatch
  '132015', // template paused (low quality)
  '132016', // template disabled
]);

/** Pure: turn Meta's error body into a result the dispatcher can act on. */
export function classifyWhatsAppError(
  status: number,
  body: unknown,
): WhatsAppResult & { sent: false } {
  const err = (
    body as {
      error?: { code?: number | string; message?: string; error_data?: { details?: string } };
    }
  )?.error;
  const code = err?.code != null ? String(err.code) : `http_${status}`;
  const message =
    [err?.message, err?.error_data?.details].filter(Boolean).join(' — ') || `HTTP ${status}`;
  return { sent: false, retryable: !PERMANENT_CODES.has(code), code, message };
}

/**
 * Send one template message. Never throws: a network failure is a retryable
 * result like any other, so the caller has one shape to handle.
 */
export async function sendWhatsAppTemplate(
  config: WhatsAppConfig,
  msg: WhatsAppTemplateMessage,
): Promise<WhatsAppResult> {
  if (!isE164(msg.to)) {
    return {
      sent: false,
      retryable: false,
      code: 'invalid_phone',
      message: 'recipient is not E.164',
    };
  }

  return await postMessage(config, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    // Meta wants the digits only; the leading + is accepted today but not documented.
    to: msg.to.slice(1),
    type: 'template',
    template: {
      name: msg.template,
      language: { code: msg.language },
      ...(msg.bodyParams.length
        ? {
            components: [
              {
                type: 'body',
                parameters: msg.bodyParams.map((text) => ({ type: 'text', text })),
              },
            ],
          }
        : {}),
    },
  });
}

/**
 * Send free text. ONLY valid inside the 24-hour window that opens when the
 * person messages us — e.g. confirming a STOP reply. Outside that window Meta
 * rejects it (131047); business-initiated messages must be templates.
 */
export async function sendWhatsAppText(
  config: WhatsAppConfig,
  to: string,
  text: string,
): Promise<WhatsAppResult> {
  if (!isE164(to)) {
    return {
      sent: false,
      retryable: false,
      code: 'invalid_phone',
      message: 'recipient is not E.164',
    };
  }
  return await postMessage(config, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to.slice(1),
    type: 'text',
    text: { body: text, preview_url: false },
  });
}

async function postMessage(config: WhatsAppConfig, body: unknown): Promise<WhatsAppResult> {
  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // Meta answers in well under a second; a hung request must not eat the
      // dispatcher's whole run, which has 49 other rows to get through.
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    return {
      sent: false,
      retryable: true,
      code: 'network',
      message: e instanceof Error ? e.message : 'network_error',
    };
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) return classifyWhatsAppError(res.status, json);

  const messageId = (json as { messages?: Array<{ id?: string }> } | null)?.messages?.[0]?.id;
  if (!messageId) {
    return {
      sent: false,
      retryable: true,
      code: 'no_message_id',
      message: 'Meta accepted but returned no id',
    };
  }
  return { sent: true, messageId };
}

/** `+256772123456` -> `+256•••••456`, for logs. */
export function maskPhone(phone: string): string {
  return phone.length <= 7
    ? '•••'
    : `${phone.slice(0, 4)}${'•'.repeat(phone.length - 7)}${phone.slice(-3)}`;
}
