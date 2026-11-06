/**
 * An invoice's money, computed in the browser for the live preview.
 *
 * THIS IS A MIRROR. The figures that are stored come from
 * `_invoice_recompute` in 20261105000006_financial_document_rpc.sql, which
 * runs on every save; this only lets the vendor watch the total move as they
 * type. `invoicePricing.test.ts` pins it to the same cases the SQL test
 * checks, so the two cannot quietly disagree.
 *
 *   line_total     = round(round(qty, 2) × round(unit_price))
 *   subtotal       = Σ item lines
 *   discount_total = round(subtotal × rate / 100)   or round(fixed amount)
 *   charges_total  = Σ charge lines (not discounted)
 *   taxable        = subtotal − discount_total + charges_total
 *   tax_total      = exclusive: round(taxable × rate / 100)
 *                    inclusive: round(taxable − taxable / (1 + rate / 100))
 *   total          = exclusive: taxable + tax_total; inclusive: taxable
 *
 * `round` is to the currency's minor unit, every step.
 */
import { cleanAmountInput, roundMoney, roundTo } from './money';
import type { DiscountKind, InvoiceItemKind } from './types';

export type PricingLineInput = {
  kind: InvoiceItemKind;
  quantity: number | string | null | undefined;
  unitPrice: number | string | null | undefined;
};

export type PricingInput = {
  currency: string;
  lines: readonly PricingLineInput[];
  discountType: DiscountKind | null;
  discountValue: number | string | null | undefined;
  /** Null or blank means no tax. */
  taxRate: number | string | null | undefined;
  taxInclusive: boolean;
};

export type InvoicePricing = {
  lineTotals: number[];
  subtotal: number;
  discountTotal: number;
  chargesTotal: number;
  taxableAmount: number;
  taxTotal: number;
  total: number;
  /** The server refuses to save this; the form says so first. */
  discountExceedsSubtotal: boolean;
};

function num(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const n = typeof value === 'number' ? value : Number(cleanAmountInput(value));
  return Number.isFinite(n) ? n : null;
}

export function invoicePricing(input: PricingInput): InvoicePricing {
  const { currency } = input;

  const lineTotals = input.lines.map((line) => {
    const qty = roundTo(num(line.quantity) ?? 0, 2);
    const price = roundMoney(num(line.unitPrice) ?? 0, currency);
    return roundMoney(qty * price, currency);
  });

  let subtotal = 0;
  let chargesTotal = 0;
  input.lines.forEach((line, i) => {
    if (line.kind === 'charge') chargesTotal += lineTotals[i];
    else subtotal += lineTotals[i];
  });
  subtotal = roundMoney(subtotal, currency);
  chargesTotal = roundMoney(chargesTotal, currency);

  const discountValue = num(input.discountValue);
  let discountTotal = 0;
  if (input.discountType === 'percentage' && discountValue) {
    discountTotal = roundMoney((subtotal * discountValue) / 100, currency);
  } else if (input.discountType === 'fixed' && discountValue) {
    discountTotal = roundMoney(discountValue, currency);
  }
  const discountExceedsSubtotal = discountTotal > subtotal;

  const taxableAmount = roundMoney(subtotal - discountTotal + chargesTotal, currency);

  const rate = num(input.taxRate);
  let taxTotal = 0;
  let total = taxableAmount;
  if (rate !== null && rate > 0) {
    if (input.taxInclusive) {
      taxTotal = roundMoney(taxableAmount - taxableAmount / (1 + rate / 100), currency);
    } else {
      taxTotal = roundMoney((taxableAmount * rate) / 100, currency);
      total = roundMoney(taxableAmount + taxTotal, currency);
    }
  }

  return {
    lineTotals,
    subtotal,
    discountTotal,
    chargesTotal,
    taxableAmount,
    taxTotal,
    total,
    discountExceedsSubtotal,
  };
}
