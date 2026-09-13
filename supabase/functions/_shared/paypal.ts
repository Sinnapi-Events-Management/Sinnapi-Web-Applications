// PayPal REST client — hosted checkout (Orders v2) + webhook verification.
//
// Card details are entered on PayPal's own pages and never reach Sinnapi, so
// the platform stays in PCI DSS SAQ A scope. We hold nothing but an order id.
//
// Configure: PAYPAL_BASE_URL, PAYPAL_CLIENT_ID, PAYPAL_SECRET,
//            PAYPAL_WEBHOOK_ID.
// Sandbox base: https://api-m.sandbox.paypal.com
//
// The return and cancel addresses are NOT read from the environment here any
// more. They are passed in per call, because they differ by portal and the
// caller is the only thing that knows which portal a given payment belongs to
// — see `portalReturnUrl` in publicUrl.ts. PAYPAL_RETURN_URL /
// PAYPAL_CANCEL_URL survive only as optional overrides, handled there.
import { fetchJson, withDeadline, DeadlineError } from './deadline.ts';
import { publicHttpsUrl } from './publicUrl.ts';

const BASE = (Deno.env.get('PAYPAL_BASE_URL') ?? 'https://api-m.paypal.com')
  .trim()
  .replace(/\/+$/, '');

/**
 * Default budget for one PayPal call, when a caller does not impose its own.
 *
 * `create-payment` always imposes its own — it has a request-wide budget to
 * divide up — so this applies to the webhook and the reconciliation sweep,
 * neither of which has a person waiting on it.
 *
 * A previous version of this file set a 12-second `AbortSignal.timeout` and
 * considered the problem solved. It was not: the runtime ignored the abort on
 * a connection that stalled before responding, and the call ran until the Edge
 * wall-clock limit killed the whole function. `fetchJson` races the deadline
 * as well as signalling it, which is the part that actually holds. See the
 * header of deadline.ts.
 */
const DEFAULT_TIMEOUT_MS = 12_000;

/** Shape of an error PayPal returns in a non-2xx body. */
type PayPalError = {
  message?: string;
  debug_id?: string;
  details?: Array<{ issue?: string; description?: string; field?: string }>;
};

/**
 * Turn a PayPal failure into one line that names the actual fault.
 *
 * PayPal's `message` is the same generic sentence for every business
 * validation failure ("Request is not well-formed, syntactically incorrect,
 * or violates schema."), which is precisely why the currency bug read as a
 * configuration fault for so long. The fault is in `details[0].issue`, the
 * offending field is in `details[0].field`, and `debug_id` is the first thing
 * PayPal support asks for. All three go in.
 */
function describeFailure(status: number, body: unknown, text: string): string {
  const b = (body ?? {}) as PayPalError;
  const first = b.details?.[0];
  const parts = [
    first?.issue ?? b.message ?? `http_${status}`,
    first?.field ? `field ${first.field}` : null,
    b.debug_id ? `debug_id ${b.debug_id}` : null,
  ].filter(Boolean);

  // Nothing parseable came back: keep a bounded slice of whatever did, because
  // an HTML error page still tells you which hop refused you.
  if (parts.length === 1 && !b.message && !first?.issue && text) {
    return `http_${status}: ${text.slice(0, 200)}`;
  }
  return parts.join(', ');
}

function credentials(): { clientId: string; secret: string } {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID')?.trim();
  const secret = Deno.env.get('PAYPAL_SECRET')?.trim();
  if (!clientId || !secret) {
    // Without this the code below would send `Basic dW5kZWZpbmVkOnVuZGVmaW5lZA==`
    // and lean on PayPal to reject it. Fail here instead, with a message that
    // names the actual problem.
    throw new Error('paypal_not_configured: PAYPAL_CLIENT_ID / PAYPAL_SECRET are unset');
  }
  return { clientId, secret };
}

let cached: { token: string; expiresAt: number } | null = null;

export async function accessToken(timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const { clientId, secret } = credentials();
  const r = await fetchJson('paypal_auth', timeoutMs, `${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!r.ok) {
    const b = (r.body ?? {}) as { error_description?: string };
    throw new Error(`paypal_auth_failed: ${b.error_description ?? r.status}`);
  }

  const b = (r.body ?? {}) as { access_token?: unknown; expires_in?: unknown };
  const token = typeof b.access_token === 'string' ? b.access_token.trim() : '';
  if (!token) {
    // This was reachable. The old code read the body with
    // `.catch(() => ({}))` OUTSIDE the timeout, so an aborted or unparseable
    // response became `{}` while `res.ok` still said 200 — and every
    // subsequent call went out as `Authorization: Bearer undefined`, to be
    // rejected by PayPal as a 401 that pointed at nothing.
    throw new Error('paypal_auth_failed: response carried no access_token');
  }

  const expiresIn = Number(b.expires_in);
  cached = {
    token,
    expiresAt: Date.now() + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 300) * 1000,
  };
  return token;
}

/**
 * Create a hosted checkout order.
 *
 * `intent: CAPTURE` means the buyer's approval is followed by an explicit
 * capture call — approval alone moves no money. That distinction was the bug
 * in an earlier version, which funded escrow on CHECKOUT.ORDER.APPROVED and
 * never captured at all.
 *
 * `custom_id` carries our payment id: unlike `reference_id` it is echoed on
 * the capture resource, which is the event we actually act on.
 *
 * `returnUrl` and `cancelUrl` are REQUIRED and are re-checked here even though
 * the caller has already checked them. PayPal redirects a real browser to
 * these, so an address it cannot reach is not a field it rejects cleanly — it
 * is the request that stopped answering and took the whole function's
 * wall-clock budget with it. Two cheap checks are worth more than one, for a
 * failure mode that cost this long to find.
 */
export async function createOrder(params: {
  reference: string;
  amount: number;
  currency: string;
  description?: string;
  returnUrl: string;
  cancelUrl: string;
  timeoutMs?: number;
}): Promise<{ id: string; approveUrl: string }> {
  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  for (const [name, value] of [
    ['return_url', params.returnUrl],
    ['cancel_url', params.cancelUrl],
  ] as const) {
    const checked = publicHttpsUrl(value);
    if (!checked.ok) {
      throw new Error(`paypal_callback_url_invalid: ${name} is ${checked.reason}`);
    }
  }

  // PayPal quotes currency amounts to the minor unit and rejects a value whose
  // precision does not match (DECIMAL_PRECISION). USD is two places; the
  // conversion in `apply_payment_fx` already rounds to the cent, so this is
  // formatting rather than rounding.
  const value = params.amount.toFixed(2);

  // Spend the token budget out of the same allowance, so the two calls
  // together cannot exceed what the caller allowed for the pair.
  const started = Date.now();
  const t = await accessToken(timeoutMs);
  const left = Math.max(1_000, timeoutMs - (Date.now() - started));

  const r = await fetchJson('paypal_create_order', left, `${BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${t}`,
      'Content-Type': 'application/json',
      // Makes order creation itself safe to retry on a network timeout.
      'PayPal-Request-Id': params.reference,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: params.reference,
          custom_id: params.reference,
          description: (params.description ?? 'Sinnapi booking').slice(0, 127),
          amount: { currency_code: params.currency, value },
        },
      ],
      application_context: {
        brand_name: 'Sinnapi',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
      },
    }),
  });

  if (!r.ok) throw new Error(`paypal_order_failed: ${describeFailure(r.status, r.body, r.text)}`);

  const b = (r.body ?? {}) as { id?: string; links?: Array<{ rel?: string; href?: string }> };
  const approve = (b.links ?? []).find((l) => l.rel === 'approve')?.href;
  if (!b.id) throw new Error('paypal_order_failed: response carried no order id');
  if (!approve) throw new Error('paypal_no_approve_link');
  return { id: b.id, approveUrl: approve };
}

export type PayPalCapture = {
  status: string;
  captureId: string | null;
  amount: number;
  currency: string;
  /** PayPal's own fee for this transaction, for fee-variance reconciliation. */
  feeAmount: number | null;
};

/**
 * Take the money. Idempotent through `PayPal-Request-Id`, and an order that is
 * already captured returns ORDER_ALREADY_CAPTURED, which we treat as success
 * rather than an error — a duplicate webhook must not fail the flow.
 */
export async function captureOrder(
  orderId: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<PayPalCapture> {
  const t = await accessToken(timeoutMs);
  const r = await fetchJson(
    'paypal_capture',
    timeoutMs,
    `${BASE}/v2/checkout/orders/${orderId}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${t}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `cap-${orderId}`,
      },
    },
  );

  if (!r.ok) {
    const issue = ((r.body ?? {}) as PayPalError).details?.[0]?.issue;
    if (issue === 'ORDER_ALREADY_CAPTURED') return await getOrder(orderId, timeoutMs);
    throw new Error(`paypal_capture_failed: ${describeFailure(r.status, r.body, r.text)}`);
  }
  return readCapture((r.body ?? {}) as Record<string, unknown>);
}

/** Authoritative order state — used by reconciliation when a webhook is lost. */
export async function getOrder(
  orderId: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<PayPalCapture> {
  const t = await accessToken(timeoutMs);
  const r = await fetchJson(
    'paypal_get_order',
    timeoutMs,
    `${BASE}/v2/checkout/orders/${orderId}`,
    { headers: { Authorization: `Bearer ${t}` } },
  );
  if (!r.ok)
    throw new Error(`paypal_get_order_failed: ${describeFailure(r.status, r.body, r.text)}`);
  return readCapture((r.body ?? {}) as Record<string, unknown>);
}

function readCapture(order: Record<string, unknown>): PayPalCapture {
  const unit = (order.purchase_units as Array<Record<string, never>> | undefined)?.[0];
  const capture = (unit?.payments as { captures?: Array<Record<string, never>> } | undefined)
    ?.captures?.[0];
  const amount = capture?.amount as { value?: string; currency_code?: string } | undefined;
  const breakdown = (
    capture?.seller_receivable_breakdown as { paypal_fee?: { value?: string } } | undefined
  )?.paypal_fee;

  return {
    status: (capture?.status as string | undefined) ?? (order.status as string) ?? 'UNKNOWN',
    captureId: (capture?.id as string | undefined) ?? null,
    amount: Number(amount?.value ?? 0),
    currency: amount?.currency_code ?? '',
    feeAmount: breakdown?.value != null ? Number(breakdown.value) : null,
  };
}

/**
 * Verify a webhook came from PayPal.
 *
 * Uses the postback endpoint rather than local CRC32 + certificate checking.
 * The offline route is faster, but it requires fetching and caching PayPal's
 * signing certificate and getting the signed-string reconstruction exactly
 * right — a verification bug there fails open. The postback is the officially
 * supported path and its latency sits inside a background webhook, not a user
 * request, so the trade is worth taking.
 */
export async function verifyWebhook(headers: Headers, rawBody: string): Promise<boolean> {
  const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID');
  if (!webhookId) {
    console.error(JSON.stringify({ level: 'error', message: 'paypal_webhook_id_missing' }));
    return false; // fail closed
  }

  try {
    const t = await accessToken();
    const r = await fetchJson(
      'paypal_verify_webhook',
      DEFAULT_TIMEOUT_MS,
      `${BASE}/v1/notifications/verify-webhook-signature`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_algo: headers.get('paypal-auth-algo'),
          cert_url: headers.get('paypal-cert-url'),
          transmission_id: headers.get('paypal-transmission-id'),
          transmission_sig: headers.get('paypal-transmission-sig'),
          transmission_time: headers.get('paypal-transmission-time'),
          webhook_id: webhookId,
          // Must be the parsed body of the exact bytes received — re-serialising
          // a mutated object would change the signature base.
          webhook_event: JSON.parse(rawBody),
        }),
      },
    );
    return ((r.body ?? {}) as { verification_status?: string }).verification_status === 'SUCCESS';
  } catch (e) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'paypal_verify_failed',
        detail: e instanceof Error ? e.message : String(e),
        timedOut: e instanceof DeadlineError,
      }),
    );
    return false; // fail closed
  }
}

export { withDeadline };
