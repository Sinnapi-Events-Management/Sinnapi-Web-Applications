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

export const quotationFormSchema = z.object({
  items: z.array(quotationItemSchema).min(1, 'Add at least one line item.'),
  valid_days: requiredIntField('Validity', 1).refine(
    (v) => Number(v) <= 365,
    'Validity cannot exceed 365 days.',
  ),
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
  };
}
