/**
 * Money formatting, shared by all three portals.
 *
 * Pure data (no React/MUI) for the same reason `statusColor` is: an amount
 * that reads `UGX 226,600` in the client portal must not read `226600 UGX` in
 * admin. Escrow shows the same figure to three audiences at once, so a
 * divergence here is a support ticket.
 */

/** Currencies Sinnapi charges in and how many decimals each actually uses. */
const FRACTION_DIGITS: Record<string, number> = {
  // UGX has no subunit in practice; showing `.00` on every price is noise.
  UGX: 0,
  USD: 2,
  EUR: 2,
  GBP: 2,
  KES: 0,
};

export type MoneyFormatOptions = {
  /** Force decimals on, e.g. in a ledger where exact cents matter. */
  precise?: boolean;
  /** Drop the currency code and return the number alone. */
  bare?: boolean;
};

/**
 * `formatAmount(226600, 'UGX')` → `UGX 226,600`.
 *
 * Null and undefined render as an em dash rather than `UGX 0` — "we do not
 * know" and "nothing" are different statements to make about money.
 */
export function formatAmount(
  amount: number | string | null | undefined,
  currency = 'UGX',
  options: MoneyFormatOptions = {},
): string {
  if (amount === null || amount === undefined || amount === '') return '—';

  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(value)) return '—';

  const digits = options.precise ? 2 : (FRACTION_DIGITS[currency] ?? 2);
  const formatted = new Intl.NumberFormat('en-UG', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);

  return options.bare ? formatted : `${currency} ${formatted}`;
}

/** `formatRate(10)` → `10%`; `formatRate(12.5)` → `12.5%`. */
export function formatRate(rate: number | string | null | undefined): string {
  if (rate === null || rate === undefined || rate === '') return '—';
  const value = typeof rate === 'string' ? Number(rate) : rate;
  if (!Number.isFinite(value)) return '—';
  // Trailing `.00` on a whole percentage is noise; 12.50 keeps one decimal.
  return `${Number(value.toFixed(2))}%`;
}

/** Human label for a manual settlement method. */
export function settlementMethodLabel(method: string | null | undefined): string {
  if (!method) return '—';
  const LABELS: Record<string, string> = {
    bank_deposit: 'Bank deposit',
    mtn_momo: 'MTN Mobile Money',
    airtel_money: 'Airtel Money',
    merchant: 'Merchant transfer',
    cash: 'Cash',
    other: 'Other',
  };
  return LABELS[method] ?? method.replace(/_/g, ' ');
}

/** Human label for a payment rail the client can pick at checkout. */
export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '—';
  const LABELS: Record<string, string> = {
    mtn_momo: 'MTN Mobile Money',
    airtel_money: 'Airtel Money',
    card: 'Card',
  };
  return LABELS[method] ?? method.replace(/_/g, ' ');
}
