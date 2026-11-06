// Pure helpers for send-financial-document: request parsing, masking,
// formatting, PDF checks and error mapping. No network, no Supabase — so
// `lib.test.ts` can exercise all of it with `deno test`.

import { HttpError } from '../_shared/supabase.ts';

export const MAX_PDF_BYTES = 5 * 1024 * 1024; // matches the bucket's file_size_limit
export const MAX_MESSAGE_CHARS = 2000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type DocumentKind = 'invoice' | 'receipt';

export type SendRequest = {
  kind: DocumentKind;
  id: string;
  /**
   * `client_account` (the registered client's hidden email), `self` (only the
   * vendor's own account email), an address, or omitted for the default.
   */
  to: 'client_account' | 'self' | string | null;
  ccSelf: boolean;
  message: string | null;
  requestKey: string;
};

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

export function isEmail(v: unknown): v is string {
  return typeof v === 'string' && v.length <= 254 && EMAIL_RE.test(v);
}

/** Validate the request body. Throws a 400 naming the first bad field. */
export function parseSendRequest(raw: unknown): SendRequest {
  if (!raw || typeof raw !== 'object')
    throw new HttpError(400, 'invalid_body: expected a JSON object');
  const b = raw as Record<string, unknown>;

  if (b.kind !== 'invoice' && b.kind !== 'receipt') {
    throw new HttpError(400, 'invalid_kind: kind must be "invoice" or "receipt"');
  }
  if (!isUuid(b.id)) throw new HttpError(400, 'invalid_id: id must be a document id');
  if (!isUuid(b.requestKey))
    throw new HttpError(400, 'invalid_request_key: requestKey must be a uuid');

  let to: SendRequest['to'] = null;
  if (b.to !== undefined && b.to !== null && b.to !== '') {
    if (b.to === 'client_account' || b.to === 'self') {
      to = b.to;
    } else if (isEmail(typeof b.to === 'string' ? b.to.trim() : b.to)) {
      to = (b.to as string).trim().toLowerCase();
    } else {
      throw new HttpError(400, 'invalid_recipient: enter a valid email address');
    }
  }

  let message: string | null = null;
  if (typeof b.message === 'string' && b.message.trim() !== '') {
    message = b.message.trim();
    if (message.length > MAX_MESSAGE_CHARS) {
      throw new HttpError(
        400,
        `message_too_long: keep the message under ${MAX_MESSAGE_CHARS} characters`,
      );
    }
  }

  return {
    kind: b.kind,
    id: b.id,
    to,
    // A send to yourself is already your copy.
    ccSelf: to !== 'self' && b.ccSelf === true,
    message,
    requestKey: b.requestKey,
  };
}

/** `sarah.k@gmail.com` → `s***@gmail.com`. What the vendor's history shows for a hidden address. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 0) return '***';
  return `${email[0]}***${email.slice(at)}`;
}

/** `UGX 1,500,000`, `USD 53.97` — the currency code, then the amount in its own minor unit. */
export function formatMoney(amount: number | string, currency: string, minorUnit: number): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  const digits = Number.isInteger(minorUnit) && minorUnit >= 0 && minorUnit <= 4 ? minorUnit : 2;
  const formatted = new Intl.NumberFormat('en-UG', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
  return `${currency} ${formatted}`;
}

/**
 * How a balance reads: what is still owed, or — once receipts exceed the
 * total (1106b) — how much was overpaid. Never a negative "balance due".
 */
export function balanceLine(
  balance: number | string,
  currency: string,
  minorUnit: number,
): { label: string; value: string; overpaid: boolean } {
  const n = typeof balance === 'string' ? Number(balance) : balance;
  if (n < 0) {
    return { label: 'Overpaid by', value: formatMoney(-n, currency, minorUnit), overpaid: true };
  }
  return {
    label: 'Outstanding balance',
    value: formatMoney(n, currency, minorUnit),
    overpaid: false,
  };
}

/** `2026-11-19` → `19 Nov 2026`. Dates are calendar dates, so no timezone shift. */
export function formatDate(isoDate: string): string {
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** A real PDF starts with `%PDF-`. Anything else in the bucket is refused. */
export function isPdf(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Base64 without a dependency; chunked so a 5 MB file does not blow the call stack. */
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** The file name the client sees on the attachment. */
export function attachmentName(kind: DocumentKind, documentNo: string): string {
  return `${kind === 'invoice' ? 'Invoice' : 'Receipt'}-${documentNo}.pdf`;
}

/**
 * Turn a database refusal from the delivery RPCs into an HTTP status the
 * portal can act on. The `code: sentence` text is passed through so the
 * vendor reads the database's own explanation.
 */
export function rpcHttpError(message: string): HttpError {
  const code = message.split(':')[0].trim();
  const status =
    code === 'not_found'
      ? 404
      : code === 'daily_email_limit_reached'
        ? 429
        : code === 'document_not_sendable'
          ? 409
          : code === 'attachment_path_invalid' || code === 'invalid_kind'
            ? 400
            : 500;
  return new HttpError(
    status,
    status === 500 ? 'delivery_failed: could not record this email' : message,
  );
}
