// PayPal REST client — hosted checkout (Orders v2) + webhook verification.
//
// Card details are entered on PayPal's own pages and never reach Sinnapi, so
// the platform stays in PCI DSS SAQ A scope. We hold nothing but an order id.
//
// Configure: PAYPAL_BASE_URL, PAYPAL_CLIENT_ID, PAYPAL_SECRET,
//            PAYPAL_WEBHOOK_ID, PAYPAL_RETURN_URL, PAYPAL_CANCEL_URL.
// Sandbox base: https://api-m.sandbox.paypal.com
const BASE = Deno.env.get('PAYPAL_BASE_URL') ?? 'https://api-m.paypal.com';

let cached: { token: string; expiresAt: number } | null = null;

export async function accessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const creds = btoa(`${Deno.env.get('PAYPAL_CLIENT_ID')}:${Deno.env.get('PAYPAL_SECRET')}`);
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`paypal_auth_failed: ${b?.error_description ?? res.status}`);
  cached = {
    token: b.access_token as string,
    expiresAt: Date.now() + (b.expires_in ?? 300) * 1000,
  };
  return cached.token;
}

/**
 * Create a hosted checkout order.
 *
 * `intent: CAPTURE` means the buyer's approval is followed by an explicit
 * capture call — approval alone moves no money. That distinction was the bug
 * in the previous version, which funded escrow on CHECKOUT.ORDER.APPROVED and
 * never captured at all.
 *
 * `custom_id` carries our payment id: unlike `reference_id` it is echoed on
 * the capture resource, which is the event we actually act on.
 */
export async function createOrder(params: {
  reference: string;
  amount: number;
  currency: string;
  description?: string;
}): Promise<{ id: string; approveUrl: string }> {
  const t = await accessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders`, {
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
          amount: {
            currency_code: params.currency,
            value: params.amount.toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'Sinnapi',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
        return_url: Deno.env.get('PAYPAL_RETURN_URL'),
        cancel_url: Deno.env.get('PAYPAL_CANCEL_URL'),
      },
    }),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`paypal_order_failed: ${b?.message ?? res.status}`);

  const approve = (b.links ?? []).find((l: { rel: string; href: string }) => l.rel === 'approve');
  if (!approve?.href) throw new Error('paypal_no_approve_link');
  return { id: b.id, approveUrl: approve.href };
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
export async function captureOrder(orderId: string): Promise<PayPalCapture> {
  const t = await accessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${t}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `cap-${orderId}`,
    },
  });
  const b = await res.json().catch(() => ({}));

  if (!res.ok) {
    const issue = b?.details?.[0]?.issue;
    if (issue === 'ORDER_ALREADY_CAPTURED') return getOrder(orderId);
    throw new Error(`paypal_capture_failed: ${issue ?? b?.message ?? res.status}`);
  }
  return readCapture(b);
}

/** Authoritative order state — used by reconciliation when a webhook is lost. */
export async function getOrder(orderId: string): Promise<PayPalCapture> {
  const t = await accessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`paypal_get_order_failed: ${res.status}`);
  return readCapture(b);
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
    const res = await fetch(`${BASE}/v1/notifications/verify-webhook-signature`, {
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
    });
    const b = await res.json().catch(() => ({}));
    return b.verification_status === 'SUCCESS';
  } catch (e) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'paypal_verify_failed',
        detail: e instanceof Error ? e.message : String(e),
      }),
    );
    return false; // fail closed
  }
}
