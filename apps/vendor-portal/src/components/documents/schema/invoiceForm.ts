import { z } from 'zod';
import {
  addDays,
  amountInputNumber,
  cleanAmountInput,
  kampalaToday,
  type InvoiceRow,
} from '@sinnapi/ui/documents';
import {
  checkRecipient,
  emptyRecipient,
  recipientPayload,
  recipientShape,
  type RecipientValues,
} from './recipient';

const numberText = (label: string, opts: { min?: number; allowZero?: boolean } = {}) =>
  z
    .string()
    .trim()
    .refine((v) => v !== '' && !Number.isNaN(amountInputNumber(v)), `Enter the ${label}.`)
    .refine(
      (v) =>
        opts.allowZero
          ? amountInputNumber(v) >= (opts.min ?? 0)
          : amountInputNumber(v) > (opts.min ?? 0),
      opts.allowZero ? `The ${label} cannot be negative.` : `The ${label} must be more than zero.`,
    );

export const invoiceLineSchema = z.object({
  kind: z.enum(['item', 'charge']),
  description: z
    .string()
    .trim()
    .min(1, 'Describe this line.')
    .max(500, 'Keep it under 500 characters.'),
  quantity: numberText('quantity'),
  unit_price: numberText('price', { allowZero: true }),
});

export type InvoiceLineValues = z.infer<typeof invoiceLineSchema>;

const optionalRate = (label: string, max: number) =>
  z
    .string()
    .trim()
    .refine(
      (v) => v === '' || !Number.isNaN(amountInputNumber(v)),
      `Enter a number for the ${label}.`,
    )
    .refine((v) => v === '' || amountInputNumber(v) >= 0, `The ${label} cannot be negative.`)
    .refine(
      (v) => v === '' || amountInputNumber(v) <= max,
      `The ${label} cannot be more than ${max}.`,
    );

export const invoiceFormSchema = z
  .object({
    ...recipientShape,
    title: z.string().trim().max(200, 'Keep it under 200 characters.'),
    issue_date: z.string().min(1, 'Choose the issue date.'),
    due_date: z.string().min(1, 'Choose the due date.'),
    currency: z.string().min(3),
    items: z.array(invoiceLineSchema).max(200, 'An invoice can have at most 200 lines.'),
    discount_type: z.enum(['', 'percentage', 'fixed']),
    discount_value: optionalRate('discount', Number.MAX_SAFE_INTEGER),
    tax_enabled: z.boolean(),
    tax_label: z.string().trim().max(40, 'Keep the tax name short.'),
    tax_rate: optionalRate('tax rate', 100),
    tax_inclusive: z.boolean(),
    payment_instructions: z.string().trim().max(1000, 'Keep this under 1,000 characters.'),
    notes: z.string().trim().max(2000, 'Keep this under 2,000 characters.'),
    terms: z.string().trim().max(2000, 'Keep this under 2,000 characters.'),
    show_vendor_tax_id: z.boolean(),
  })
  .superRefine((v, ctx) => {
    checkRecipient(v, ctx);
    if (v.due_date && v.issue_date && v.due_date < v.issue_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['due_date'],
        message: 'The due date cannot be before the issue date.',
      });
    }
    if (v.issue_date > kampalaToday()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['issue_date'],
        message: 'The issue date cannot be later than today.',
      });
    }
    if (
      v.discount_type === 'percentage' &&
      v.discount_value !== '' &&
      amountInputNumber(v.discount_value) > 100
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discount_value'],
        message: 'A percentage cannot be more than 100.',
      });
    }
    if (v.tax_enabled && (v.tax_rate === '' || amountInputNumber(v.tax_rate) <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tax_rate'],
        message: 'Enter the tax rate, or remove the tax.',
      });
    }
  });

export type InvoiceFormValues = RecipientValues & {
  title: string;
  issue_date: string;
  due_date: string;
  currency: string;
  items: InvoiceLineValues[];
  discount_type: '' | 'percentage' | 'fixed';
  discount_value: string;
  tax_enabled: boolean;
  tax_label: string;
  tax_rate: string;
  tax_inclusive: boolean;
  payment_instructions: string;
  notes: string;
  terms: string;
  show_vendor_tax_id: boolean;
};

export const DUE_PRESETS = [
  { label: 'On receipt', days: 0 },
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
  { label: '30 days', days: 30 },
] as const;

export const CURRENCY_OPTIONS = [
  { value: 'UGX', label: 'UGX — Uganda shilling' },
  { value: 'USD', label: 'USD — US dollar' },
];

export const DISCOUNT_TYPE_OPTIONS = [
  { value: '', label: 'No discount' },
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'fixed', label: 'Fixed amount' },
];

export const emptyLine = (kind: 'item' | 'charge' = 'item'): InvoiceLineValues => ({
  kind,
  description: '',
  quantity: '1',
  unit_price: '',
});

export function emptyInvoiceValues(): InvoiceFormValues {
  const today = kampalaToday();
  return {
    ...emptyRecipient,
    title: '',
    issue_date: today,
    due_date: addDays(today, 14),
    currency: 'UGX',
    items: [emptyLine()],
    discount_type: '',
    discount_value: '',
    tax_enabled: false,
    tax_label: '',
    tax_rate: '',
    tax_inclusive: false,
    payment_instructions: '',
    notes: '',
    terms: '',
    show_vendor_tax_id: false,
  };
}

const text = (v: unknown) => (v === null || v === undefined ? '' : String(v));

/** A saved draft back into the form. */
export function invoiceValuesFromRow(row: InvoiceRow): InvoiceFormValues {
  const lines = [...(row.vendor_invoice_items ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  return {
    recipient_mode: row.client_id ? 'client' : 'external',
    client_id: row.client_id ?? '',
    contact_id: row.contact_id ?? '',
    recipient_name: text(row.recipient_name),
    recipient_company: text(row.recipient_company),
    recipient_email: text(row.recipient_email),
    recipient_phone: text(row.recipient_phone),
    recipient_address: text(row.recipient_address),
    title: text(row.title),
    issue_date: row.issue_date,
    due_date: row.due_date,
    currency: row.currency,
    items: lines.length
      ? lines.map((l) => ({
          kind: l.kind,
          description: l.description,
          quantity: text(l.quantity),
          unit_price: text(l.unit_price),
        }))
      : [emptyLine()],
    discount_type: row.discount_type ?? '',
    discount_value: text(row.discount_value),
    tax_enabled: row.tax_rate !== null,
    tax_label: text(row.tax_label),
    tax_rate: text(row.tax_rate),
    tax_inclusive: row.tax_inclusive,
    payment_instructions: text(row.payment_instructions),
    notes: text(row.notes),
    terms: text(row.terms),
    show_vendor_tax_id: row.show_vendor_tax_id,
  };
}

const blank = (s: string) => (s.trim() === '' ? null : s.trim());

/** The form as `save_invoice_draft`'s payload. The server recomputes every figure. */
export function invoicePayload(v: InvoiceFormValues): Record<string, unknown> {
  return {
    ...recipientPayload(v),
    title: blank(v.title),
    issue_date: v.issue_date,
    due_date: v.due_date,
    currency: v.currency,
    show_vendor_tax_id: v.show_vendor_tax_id,
    items: v.items
      .filter((l) => l.description.trim() !== '' || l.unit_price.trim() !== '')
      .map((l) => ({
        kind: l.kind,
        description: l.description.trim(),
        quantity: cleanAmountInput(l.quantity),
        unit_price: cleanAmountInput(l.unit_price),
      })),
    discount_type: v.discount_type || null,
    discount_value: v.discount_type ? blank(cleanAmountInput(v.discount_value)) : null,
    tax_rate: v.tax_enabled ? blank(cleanAmountInput(v.tax_rate)) : null,
    tax_label: v.tax_enabled ? blank(v.tax_label) : null,
    tax_inclusive: v.tax_enabled ? v.tax_inclusive : false,
    payment_instructions: blank(v.payment_instructions),
    notes: blank(v.notes),
    terms: blank(v.terms),
  };
}
