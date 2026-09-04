// redact — what may never reach `audit_logs` or `payment_logs`.
//
// A shared helper rather than a rule each call site is trusted to follow. The
// call sites had not been following it: `psp-paypal-webhook` stored the entire
// raw event body, which carries `payer.email_address`, `payer.name`,
// `shipping.address` and, on a card capture, `payment_source.card.last_digits`
// / `brand` / `expiry`. Nobody wrote that deliberately — it is what
// `payload: event` means, and it looked like faithful logging.
//
// THERE IS NO CARDHOLDER DATA IN THIS SYSTEM AND THERE MUST NEVER BE.
// Card and wallet credentials are entered on the provider's own hosted page:
// `useEscrowCheckout` hands the payer off with a full navigation
// (`window.location.assign`), never a form of ours, which is what keeps
// Sinnapi in PCI SAQ A scope. Nothing here is a PAN filter and nothing here
// should be read as making one safe — a card number reaching this database is
// not a redaction problem, it is an incident to be reported. The card fields
// listed below are the *truncated* metadata a PSP echoes back (last four,
// brand, expiry month); they are stripped because they are personal data we
// have no reason to hold, not because they are cardholder data we are allowed
// to hold carefully.
//
// THREE CLASSES, and they are removed for different reasons:
//
//   1. SECRETS — a bearer token, a consumer key or secret, an Authorization
//      header, an API key. These must never be persisted anywhere, at any
//      time, for any reason. A leaked log row containing a Pesapal consumer
//      secret is a compromise of the merchant account.
//
//   2. PERSONAL DATA — the billing contact we send to the PSP so its own form
//      is pre-filled. `create-payment` sends the payer's email, phone and
//      name (index.ts, `submitOrder`). Recording THAT WE SENT IT is useful:
//      an investigator needs to know the PSP had a contact to reach. Recording
//      the values is a second copy of personal data in an append-only table
//      under a seven-year hold, which is a retention decision nobody made.
//      So these become a `_sent` list of field names.
//
//   3. BANKING — a decrypted account number. Nothing in the payment path
//      currently touches one (only `vendor-application` writes an account
//      number, and it writes it to its own encrypted column, never to a log),
//      but the key names are covered here so that the day a payout function
//      does handle one, the helper it already uses is not the thing that has
//      to be changed.
//
// WHAT IS DELIBERATELY KEPT. Amounts, currencies, statuses, provider
// references, tracking ids, timestamps, error codes and messages. A payload is
// evidence; a redactor that guesses at what looks sensitive removes the field
// the investigator opened the page for. Every removal here is a named key, not
// a pattern match on values.

/** Keys whose VALUE must never be persisted. Case-insensitive. */
const SECRET_KEYS = new Set(
  [
    'authorization',
    'auth',
    'token',
    'access_token',
    'refresh_token',
    'id_token',
    'bearer',
    'consumer_key',
    'consumer_secret',
    'client_id',
    'client_secret',
    'apikey',
    'api_key',
    'x-api-key',
    'secret',
    'password',
    'passwd',
    'signature_key',
    'webhook_secret',
    'private_key',
    'service_role_key',
    'anon_key',
    // Banking. See class 3 above — covered before it is needed.
    'account_number',
    'accountnumber',
    'iban',
    'swift',
    'sort_code',
    'routing_number',
    // Truncated card metadata a PSP echoes back. Not cardholder data; see the
    // header. Removed as personal data we have no reason to keep.
    'last_digits',
    'last4',
    'expiry',
    'card',
    'payment_source',
    'cvv',
    'cvc',
  ].map((k) => k.toLowerCase()),
);

/**
 * Keys whose PRESENCE is worth recording but whose value is not.
 *
 * These are the billing-contact fields `create-payment` forwards to the PSP.
 * The audit row says the contact was sent and which fields it comprised; the
 * values stay in `profiles`, where they already live under a policy.
 */
const CONTACT_KEYS = new Set(
  [
    'email',
    'email_address',
    'phone',
    'phone_number',
    'phonenumber',
    'msisdn',
    'first_name',
    'firstname',
    'last_name',
    'lastname',
    'middle_name',
    'full_name',
    'given_name',
    'surname',
    'address',
    'address_line_1',
    'address_line_2',
    'line1',
    'line2',
    'city',
    'admin_area_1',
    'admin_area_2',
    'postal_code',
    'zip',
    'shipping',
    'payer',
    'billing',
    'national_id',
  ].map((k) => k.toLowerCase()),
);

// TWO KEYS DELIBERATELY NOT IN THAT LIST, because removing them would cost
// more than it protects:
//
//   `state`  — PayPal's v1 order resource uses it for the ORDER STATE, and
//              `status_details.state` appears on captures. Dropping it would
//              delete the single most important field on a disputed capture in
//              order to remove a US state that only ever arrives nested inside
//              `shipping` or `payer`, both of which are dropped whole.
//              PayPal's own address field names (`admin_area_1`/`_2`) are
//              covered above instead.
//   `name`   — bare, it is as likely to be a plan or product name as a
//              person's. Every PSP puts a person's name at `payer.name`,
//              `first_name` or `last_name`, all of which ARE covered.
//
// The principle: a payload is evidence, and a redactor that guesses at what
// looks sensitive removes the field the investigator opened the page for.
// Every key above is one a PSP genuinely uses for personal data or a secret.

/** How deep to walk before giving up. PSP bodies nest, but not indefinitely. */
const MAX_DEPTH = 8;

/** Longest string kept verbatim. A provider that returns an HTML error page
 *  should not put a page into an append-only table. */
const MAX_STRING = 2048;

export type Redacted = Record<string, unknown>;

/**
 * Strip secrets and personal data from a payload, recording what was taken.
 *
 * The markers matter as much as the removal. A reader must be able to tell a
 * redacted field from a field the provider never sent — those mean completely
 * different things during an incident — so the result carries:
 *
 *   `_redacted`: keys whose values were dropped as secret or personal
 *   `_sent`:     billing-contact fields that were present, by name only
 *
 * Never throws. A payload that cannot be walked is replaced by a note saying
 * so; a redactor that raises would take down the webhook it was protecting.
 */
export function redact(payload: unknown): Redacted {
  const removed = new Set<string>();
  const sent = new Set<string>();

  let value: unknown;
  try {
    value = walk(payload, 0, removed, sent);
  } catch (e) {
    return {
      _redaction_failed: e instanceof Error ? e.message : 'unknown',
      _note: 'payload could not be safely redacted and was therefore not stored',
    };
  }

  const out: Redacted =
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Redacted)
      : { value };

  if (removed.size > 0) out._redacted = [...removed].sort();
  if (sent.size > 0) out._sent = [...sent].sort();
  return out;
}

function walk(node: unknown, depth: number, removed: Set<string>, sent: Set<string>): unknown {
  if (node === null || node === undefined) return null;
  if (depth > MAX_DEPTH) return '[truncated: too deep]';

  if (typeof node === 'string') {
    return node.length > MAX_STRING ? `${node.slice(0, MAX_STRING)}…[truncated]` : node;
  }
  if (typeof node === 'number' || typeof node === 'boolean') return node;

  if (Array.isArray(node)) {
    return node.slice(0, 100).map((v) => walk(v, depth + 1, removed, sent));
  }

  if (typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(node as Record<string, unknown>)) {
      const k = key.toLowerCase();

      if (SECRET_KEYS.has(k)) {
        removed.add(key);
        continue;
      }
      // A contact key is dropped whether it holds a string or a whole nested
      // object: PayPal's `payer` is an object of exactly the fields we are
      // declining to copy, so recursing into it would defeat the point.
      if (CONTACT_KEYS.has(k)) {
        sent.add(key);
        continue;
      }
      out[key] = walk(v, depth + 1, removed, sent);
    }
    return out;
  }

  // Functions, symbols, bigints — nothing a JSON body contains. Named rather
  // than serialised so an unexpected type is visible instead of silent.
  return `[unsupported: ${typeof node}]`;
}

/**
 * Redact an error before it is persisted as a `failure_reason` or an audit
 * detail. Provider SDK errors have a habit of quoting the request that failed,
 * headers included.
 */
export function redactMessage(message: string): string {
  let out = message.length > MAX_STRING ? `${message.slice(0, MAX_STRING)}…[truncated]` : message;
  // Bearer tokens and basic-auth blobs, wherever they were interpolated.
  out = out.replace(/\b(bearer|basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi, '$1 [redacted]');
  // `consumer_secret=…`, `token": "…"`, and the other shapes a quoted request
  // body takes. Bounded on the value so a long body is not rewritten wholesale.
  out = out.replace(
    /\b(consumer_secret|consumer_key|client_secret|api_?key|access_token|token|password)\b(["']?\s*[:=]\s*["']?)[^"'&,\s}]{4,}/gi,
    '$1$2[redacted]',
  );
  return out;
}
