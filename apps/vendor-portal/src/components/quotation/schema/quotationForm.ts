import { z } from 'zod';
import { requiredIntField } from '@/lib/schema';

/** A money amount typed into a line item: required, numeric, non-negative. */
const priceField = z
  .string()
  .trim()
  .min(1, 'Required.')
  .refine((v) => !Number.isNaN(Number(v)), 'Enter a number.')
  .refine((v) => Number(v) >= 0, 'Cannot be negative.');

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
  items: z.array(quotationItemSchema).min(1, 'Add at least one line item.'),
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
  items: [emptyQuotationItem],
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
  };
}

/** What the vendor takes home up front, given the quote total and the rate. */
export function advanceAmount(total: number, rate: string): number {
  const pct = Number(rate);
  if (!Number.isFinite(pct)) return 0;
  return Math.round(total * pct) / 100;
}
