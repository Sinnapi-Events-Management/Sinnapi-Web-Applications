/**
 * How the receipts on an invoice compare with its total. Pure (no React/MUI).
 *
 * Clients pay in instalments, and the instalments can add up to less than,
 * exactly, or more than the invoice (1106b). Every surface that shows an
 * invoice's money — the vendor's page, the client's page, the previews, the
 * PDFs — reads it through here, so "overpaid" is worked out once.
 *
 *   unpaid  nothing received yet
 *   short   something received, less than the total
 *   exact   received exactly the total
 *   over    received more than the total
 */
import { formatDocumentMoney, roundMoney } from './money';

export type PaymentCoverageState = 'unpaid' | 'short' | 'exact' | 'over';

export type PaymentCoverage = {
  state: PaymentCoverageState;
  total: number;
  paid: number;
  /** Always zero or more: what is still owed (`short`/`unpaid`) or the excess (`over`). */
  difference: number;
  /** Paid as a share of the total, 0–100, capped at 100 for a progress bar. */
  percent: number;
};

export function paymentCoverage(
  total: number,
  paid: number,
  currency: string | null | undefined,
): PaymentCoverage {
  const t = roundMoney(total, currency);
  const p = roundMoney(paid, currency);
  const diff = roundMoney(t - p, currency);
  const state: PaymentCoverageState =
    p <= 0 ? 'unpaid' : diff > 0 ? 'short' : diff === 0 ? 'exact' : 'over';
  return {
    state,
    total: t,
    paid: p,
    difference: Math.abs(diff),
    percent: t > 0 ? Math.min(100, Math.max(0, (p / t) * 100)) : 0,
  };
}

/**
 * The balance line of an invoice or receipt: what is still owed, or once
 * receipts exceed the total, "Overpaid by". Never prints a negative balance.
 */
export function balanceLine(
  balance: number,
  currency: string | null | undefined,
  owedLabel = 'Balance due',
): { label: string; value: string; overpaid: boolean } {
  if (balance < 0) {
    return {
      label: 'Overpaid by',
      value: formatDocumentMoney(Math.abs(balance), currency),
      overpaid: true,
    };
  }
  return { label: owedLabel, value: formatDocumentMoney(balance, currency), overpaid: false };
}

/** The flag shown beside an invoice's payments, phrased for the vendor. */
export const PAYMENT_COVERAGE_META: Readonly<
  Record<
    PaymentCoverageState,
    { label: string; severity: 'info' | 'warning' | 'success' | 'error' }
  >
> = {
  unpaid: { label: 'Not paid yet', severity: 'info' },
  short: { label: 'Less than the invoice', severity: 'warning' },
  exact: { label: 'Matches the invoice', severity: 'success' },
  over: { label: 'More than the invoice', severity: 'error' },
};

/** One sentence for the coverage flag, e.g. "UGX 50,000 more than the invoice total." */
export function paymentCoverageMessage(c: PaymentCoverage, currency: string): string {
  const diff = formatDocumentMoney(c.difference, currency);
  switch (c.state) {
    case 'unpaid':
      return `No payments recorded. ${formatDocumentMoney(c.total, currency)} is owed.`;
    case 'short':
      return `${diff} still owed.`;
    case 'exact':
      return 'Receipts match the invoice total exactly.';
    case 'over':
      return `Receipts are ${diff} more than the invoice total. Agree a refund or credit with your client.`;
  }
}

/**
 * A balance in a list cell or card, where there is no room for a label:
 * `UGX 135,500` while owed, `UGX 50,000 overpaid` once receipts exceed the
 * total. Never a minus figure.
 */
export function formatOwed(
  balance: number | string | null | undefined,
  currency: string | null | undefined,
): string {
  const n = typeof balance === 'number' ? balance : Number(balance ?? 0);
  return n < 0
    ? `${formatDocumentMoney(Math.abs(n), currency)} overpaid`
    : formatDocumentMoney(n, currency);
}
