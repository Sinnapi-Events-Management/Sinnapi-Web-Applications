// Pesapal API 3.0 client (MTN MoMo / Airtel Money / card, hosted checkout).
//
// Sinnapi never sees card or wallet credentials: the client is redirected to
// Pesapal's own page and comes back with nothing but an order tracking id.
// That keeps the platform in PCI DSS SAQ A scope.
//
// Configure: PESAPAL_BASE_URL, PESAPAL_CONSUMER_KEY, PESAPAL_CONSUMER_SECRET,
//            PESAPAL_IPN_ID, PESAPAL_CALLBACK_URL.
// Sandbox base: https://cybqa.pesapal.com/pesapalv3
const BASE = Deno.env.get('PESAPAL_BASE_URL') ?? 'https://pay.pesapal.com/v3';

/**
 * Pesapal's documented transaction states. The IPN carries no status of its
 * own by design, so this is only ever read back from GetTransactionStatus.
 */
export const PESAPAL_STATUS = {
  INVALID: 0,
  COMPLETED: 1,
  FAILED: 2,
  REVERSED: 3,
} as const;

// Tokens are valid for 5 minutes. Cached because a single IPN burst can
// otherwise open a fresh auth round-trip per notification.
let cached: { token: string; expiresAt: number } | null = null;

async function token(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

  const res = await fetch(`${BASE}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      consumer_key: Deno.env.get('PESAPAL_CONSUMER_KEY'),
      consumer_secret: Deno.env.get('PESAPAL_CONSUMER_SECRET'),
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.token) {
    throw new Error(`pesapal_auth_failed: ${body?.error?.message ?? res.status}`);
  }
  cached = { token: body.token as string, expiresAt: Date.now() + 4 * 60_000 };
  return cached.token;
}

export type PesapalOrder = {
  /** Our payment id. Comes back as OrderMerchantReference on the IPN. */
  reference: string;
  amount: number;
  currency: string;
  description: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
};

export async function submitOrder(
  params: PesapalOrder,
): Promise<{ redirectUrl: string; orderTrackingId: string }> {
  const t = await token();
  const res = await fetch(`${BASE}/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${t}`,
    },
    body: JSON.stringify({
      id: params.reference,
      currency: params.currency,
      // Pesapal rejects more than 2dp.
      amount: Number(params.amount.toFixed(2)),
      description: params.description.slice(0, 100),
      callback_url: Deno.env.get('PESAPAL_CALLBACK_URL'),
      notification_id: Deno.env.get('PESAPAL_IPN_ID'),
      billing_address: {
        email_address: params.email,
        phone_number: params.phone,
        first_name: params.firstName,
        last_name: params.lastName,
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.redirect_url) {
    throw new Error(`pesapal_order_failed: ${body?.error?.message ?? res.status}`);
  }
  return { redirectUrl: body.redirect_url, orderTrackingId: body.order_tracking_id };
}

export type PesapalStatus = {
  statusCode: number;
  description: string;
  amount: number;
  currency: string;
  merchantReference: string;
  confirmationCode: string | null;
  paymentMethod: string | null;
};

/**
 * The authoritative state of a transaction. Always re-queried during IPN
 * handling — Pesapal deliberately omits the status from the notification so
 * that a spoofed IPN cannot assert one.
 */
export async function getTransactionStatus(orderTrackingId: string): Promise<PesapalStatus> {
  const t = await token();
  const res = await fetch(
    `${BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } },
  );
  const b = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`pesapal_status_failed: ${res.status}`);
  return {
    statusCode: Number(b.status_code),
    description: b.payment_status_description ?? b.description ?? '',
    amount: Number(b.amount ?? 0),
    currency: b.currency ?? '',
    merchantReference: b.merchant_reference ?? '',
    confirmationCode: b.confirmation_code ?? null,
    paymentMethod: b.payment_method ?? null,
  };
}

/** Map a Pesapal status code onto our payment_status enum. */
export function mapPesapalStatus(code: number): 'succeeded' | 'failed' | 'refunded' | null {
  switch (code) {
    case PESAPAL_STATUS.COMPLETED:
      return 'succeeded';
    case PESAPAL_STATUS.FAILED:
      return 'failed';
    // A reversal after we already recognised the funds. Handled as a refund so
    // the escrow freezes and a human reviews it, rather than being ignored.
    case PESAPAL_STATUS.REVERSED:
      return 'refunded';
    // 0 = INVALID: the transaction is not in a settled state yet. Leave the
    // payment where it is and let reconciliation ask again later.
    default:
      return null;
  }
}
