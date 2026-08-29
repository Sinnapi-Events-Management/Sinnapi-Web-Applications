import { z } from 'zod';
import {
  packageTierPricing,
  type PackageLineLike,
  type PackageTierLike,
  type QuotePackageLike,
} from '@sinnapi/ui';
import { requiredIntField } from '@/lib/schema';

/** A money amount typed into a line item: required, numeric, non-negative. */
const priceField = z
  .string()
  .trim()
  .min(1, 'Required.')
  .refine((v) => !Number.isNaN(Number(v)), 'Enter a number.')
  .refine((v) => Number(v) >= 0, 'Cannot be negative.');

/** A percentage typed into the builder: optional, 0-100. */
const rateField = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || !Number.isNaN(Number(v)), 'Enter a number.')
    .refine((v) => v === '' || Number(v) >= 0, `${label} cannot be negative.`)
    .refine((v) => v === '' || Number(v) <= 100, `${label} cannot exceed 100%.`);

export const quotationItemSchema = z.object({
  description: z
    .string()
    .trim()
    .min(2, 'Describe this line item.')
    .max(200, 'Keep line items under 200 characters.'),
  quantity: requiredIntField('Quantity', 1),
  unit_price: priceField,
});

export type QuotationItemValues = z.infer<typeof quotationItemSchema>;

/**
 * Platform ceilings on the advance. Mirrored from `platform_settings` so the
 * form can say no immediately; the RPC re-checks against the live values,
 * which are the ones that actually bind.
 */
export const ADVANCE_RATE_MAX = 50;
export const ADVANCE_DAYS_MAX = 30;

export const quotationFormSchema = z.object({
  /**
   * The package and tier this quote was built from, carried so the client's
   * page can say which offer they are looking at and so a vendor can see which
   * packages actually convert. Empty when the quote was typed from scratch,
   * which stays a first-class way to answer a request.
   */
  template_id: z.string(),
  template_tier_id: z.string(),
  items: z.array(quotationItemSchema).min(1, 'Add at least one line item.'),
  /**
   * Discount and tax as rates rather than amounts. The server recomputes both
   * from the lines it is sent — these travel so it knows which rates to apply,
   * not so it can take the browser's arithmetic on trust.
   */
  discount_rate: rateField('Discount'),
  tax_rate: rateField('Tax'),
  tax_inclusive: z.boolean(),
  valid_days: requiredIntField('Validity', 1).refine(
    (v) => Number(v) <= 365,
    'Validity cannot exceed 365 days.',
  ),
  /**
   * The advance schedule the vendor is proposing. It travels with the quote so
   * it binds the deal whether or not the client pays through escrow, and the
   * client must accept it explicitly before any money is taken.
   */
  advance_rate: z
    .string()
    .trim()
    .min(1, 'Required.')
    .refine((v) => !Number.isNaN(Number(v)), 'Enter a number.')
    .refine((v) => Number(v) >= 0, 'Cannot be negative.')
    .refine((v) => Number(v) <= ADVANCE_RATE_MAX, `Cannot exceed ${ADVANCE_RATE_MAX}%.`),
  advance_release_days_before: requiredIntField('Advance timing', 0).refine(
    (v) => Number(v) <= ADVANCE_DAYS_MAX,
    `Cannot be more than ${ADVANCE_DAYS_MAX} days before the event.`,
  ),
  advance_terms_note: z
    .string()
    .trim()
    .max(300, 'Keep the note under 300 characters.')
    .optional()
    .or(z.literal('')),
});

export type QuotationFormValues = z.infer<typeof quotationFormSchema>;

/** A blank line item — the row "Add line item" appends. */
export const emptyQuotationItem: QuotationItemValues = {
  description: '',
  quantity: '1',
  unit_price: '0',
};

/** The starting quote: one empty line, valid for a fortnight. */
export const emptyQuotationValues: QuotationFormValues = {
  template_id: '',
  template_tier_id: '',
  items: [emptyQuotationItem],
  discount_rate: '',
  tax_rate: '',
  tax_inclusive: false,
  valid_days: '14',
  advance_rate: '30',
  advance_release_days_before: '7',
  advance_terms_note: '',
};

/**
 * The running total. Quantities and prices are strings in the form, so this
 * coerces per row and treats a half-typed value as 0 rather than NaN — the
 * total stays readable while the vendor is still typing into a field.
 */
export function quotationTotal(items: QuotationItemValues[]): number {
  return items.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    return sum + quantity * unitPrice;
  }, 0);
}

/** Money to the cent, so a rate applied to a base cannot drift by a fraction. */
const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * The quote's figures as the vendor is typing them.
 *
 * Mirrors `send_quotation`'s arithmetic exactly — see the formula stated in
 * `20260823000002_quote_packages.sql` and in `@sinnapi/ui`'s `packagePricing`.
 * This is the display half of that pair: it decides what the builder shows,
 * while the RPC decides what is charged. They are separate because a total
 * arriving from a browser is a total a browser can edit, and this one flows
 * into escrow — but they must never disagree, so both follow one formula.
 */
export function quotationFormPricing(values: {
  items?: QuotationItemValues[];
  discount_rate?: string;
  tax_rate?: string;
  tax_inclusive?: boolean;
}) {
  const base = quotationTotal(values.items ?? []);
  const discountRate = Number(values.discount_rate) || 0;
  const discount = round2((base * discountRate) / 100);
  const net = round2(base - discount);
  const taxRate = Number(values.tax_rate) || 0;
  const taxInclusive = values.tax_inclusive === true;
  const tax = taxInclusive
    ? round2(net - net / (1 + taxRate / 100))
    : round2((net * taxRate) / 100);

  return {
    base,
    discountRate,
    discount,
    net,
    taxRate,
    taxInclusive,
    tax,
    total: taxInclusive ? net : round2(net + tax),
  };
}

/** Arguments for `send_quotation`, with the numbers coerced at the boundary. */
export function toSendQuotationArgs(values: QuotationFormValues, quotationId: string) {
  return {
    p_quotation_id: quotationId,
    p_items: values.items.map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
    })),
    p_valid_days: Number(values.valid_days),
    p_advance_rate: Number(values.advance_rate),
    p_advance_release_days_before: Number(values.advance_release_days_before),
    p_advance_terms_note: values.advance_terms_note?.trim() || null,
    p_template_id: values.template_id || null,
    p_template_tier_id: values.template_tier_id || null,
    p_discount_rate: values.discount_rate.trim() === '' ? 0 : Number(values.discount_rate),
    p_tax_rate: values.tax_rate.trim() === '' ? 0 : Number(values.tax_rate),
    p_tax_inclusive: values.tax_inclusive,
  };
}

/** What the vendor takes home up front, given the quote total and the rate. */
export function advanceAmount(total: number, rate: string): number {
  const pct = Number(rate);
  if (!Number.isFinite(pct)) return 0;
  return Math.round(total * pct) / 100;
}

/**
 * A package tier as a quote, ready to send.
 *
 * This is the whole point of packages: the vendor picks the offer they already
 * priced and the builder fills itself in — lines, discount, tax, validity and
 * the advance schedule — leaving them to adjust rather than to type.
 *
 * Optional lines are deliberately NOT carried across. They are add-ons the
 * vendor decides on per client, and a quote that silently arrives with every
 * extra priced in is a quote the client reads as a padded bill. They are
 * offered separately, one click each, by the builder's add-on row.
 *
 * Values the package does not carry fall back to what is already in the form
 * rather than to the platform default, so a vendor who set a validity by hand
 * and then applied a package does not silently lose it.
 */
export function packageToQuotationValues(
  pkg: QuotePackageLike,
  tier: PackageTierLike,
  current: QuotationFormValues,
): QuotationFormValues {
  const pricing = packageTierPricing(pkg, tier);

  const items: QuotationItemValues[] = pricing.includedLines.map((line) => ({
    description: line.description ?? '',
    quantity: String(line.quantity ?? 1),
    unit_price: String(line.unit_price ?? 0),
  }));

  const orCurrent = (value: number | string | null | undefined, fallback: string) =>
    value === null || value === undefined || value === '' ? fallback : String(Number(value));

  return {
    template_id: pkg.id,
    template_tier_id: tier.id,
    // A tier always has at least one line — the database refuses to save one
    // without — but a blank row beats an empty array if that ever stops being
    // true, because `useFieldArray` renders nothing for an empty array and the
    // vendor would be looking at a builder with no fields in it.
    items: items.length > 0 ? items : [emptyQuotationItem],
    discount_rate: pricing.discountRate ? String(pricing.discountRate) : '',
    tax_rate: pricing.taxRate ? String(pricing.taxRate) : '',
    tax_inclusive: pricing.taxInclusive,
    valid_days: orCurrent(pkg.valid_days, current.valid_days),
    advance_rate: orCurrent(pkg.advance_rate, current.advance_rate),
    advance_release_days_before: orCurrent(
      pkg.advance_release_days_before,
      current.advance_release_days_before,
    ),
    advance_terms_note: pkg.advance_terms_note ?? current.advance_terms_note ?? '',
  };
}

/** One add-on as a line the vendor can append to the quote they are building. */
export function addOnToQuotationItem(line: PackageLineLike): QuotationItemValues {
  return {
    description: line.description ?? '',
    quantity: String(line.quantity ?? 1),
    unit_price: String(line.unit_price ?? 0),
  };
}
