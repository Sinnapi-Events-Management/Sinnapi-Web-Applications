/**
 * Money and dates on invoices and receipts. Pure (no React/MUI).
 *
 * Documents print the currency CODE — `UGX 4,235,000`, never `USh` — and
 * each currency in its own minor unit: whole shillings, cents for dollars.
 * The minor units mirror the `currencies` table; the server rounds with the
 * table itself, so this copy only drives the live preview.
 */

export const CURRENCY_MINOR_UNITS: Readonly<Record<string, number>> = { UGX: 0, USD: 2 };

export function minorUnit(currency: string | null | undefined): number {
  return CURRENCY_MINOR_UNITS[(currency ?? 'UGX').toUpperCase()] ?? 2;
}

/**
 * What a vendor types into an amount box, as a plain number string:
 * "600,000" or "600 000" becomes "600000". The database accepts only plain
 * decimals, and a comma is how most people write a large amount.
 */
export function cleanAmountInput(value: string | null | undefined): string {
  return (value ?? '').replace(/[\s,_]/g, '');
}

/** An amount box's value as a number (NaN when it is not one). */
export function amountInputNumber(value: string | null | undefined): number {
  const cleaned = cleanAmountInput(value);
  return cleaned === '' ? NaN : Number(cleaned);
}

/** A numeric column as a number; null and junk become 0. */
export function toAmount(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(cleanAmountInput(value));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Round half away from zero to `digits` places — Postgres `round(numeric, n)`.
 * `toPrecision(15)` strips binary noise first (1.005 × 100 = 100.49999…),
 * which is what makes this agree with the database on the edge cases.
 */
export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  const scaled = Number((Math.abs(value) * factor).toPrecision(15));
  return (Math.sign(value) * Math.round(scaled)) / factor || 0;
}

export function roundMoney(value: number, currency: string | null | undefined): number {
  return roundTo(value, minorUnit(currency));
}

/** `UGX 4,235,000`, `USD 53.97`. */
export function formatDocumentMoney(
  value: number | string | null | undefined,
  currency: string | null | undefined,
): string {
  const code = (currency ?? 'UGX').toUpperCase();
  const digits = minorUnit(code);
  const amount = new Intl.NumberFormat('en-UG', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(toAmount(value));
  return `${code} ${amount}`;
}

/** The amount without the code, for table cells under a currency heading. */
export function formatDocumentAmount(
  value: number | string | null | undefined,
  currency: string | null | undefined,
): string {
  const digits = minorUnit(currency);
  return new Intl.NumberFormat('en-UG', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(toAmount(value));
}

/** `2026-11-19` → `19 Nov 2026`. A calendar date: read in UTC so it never shifts a day. */
export function formatDocumentDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Today in Kampala as `YYYY-MM-DD` — the same "today" the database uses. */
export function kampalaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kampala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** `YYYY-MM-DD` plus whole days. */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
