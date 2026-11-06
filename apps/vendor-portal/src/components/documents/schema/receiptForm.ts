import { z } from 'zod';
import {
  amountInputNumber,
  cleanAmountInput,
  kampalaToday,
  type ReceiptPaymentMethod,
} from '@sinnapi/ui/documents';
import {
  checkRecipient,
  emptyRecipient,
  recipientPayload,
  recipientShape,
  type RecipientValues,
} from './recipient';

/**
 * Recording a payment the vendor received. Used two ways:
 *   linked      from an invoice — recipient, currency and balance come from it
 *   standalone  from "New receipt" — the vendor says who paid and what for
 */
export const receiptFormSchema = z
  .object({
    ...recipientShape,
    linked: z.boolean(),
    currency: z.string().min(3),
    amount: z
      .string()
      .trim()
      .refine((v) => v !== '' && !Number.isNaN(amountInputNumber(v)), 'Enter the amount received.')
      .refine((v) => amountInputNumber(v) > 0, 'The amount must be more than zero.'),
    payment_date: z.string().min(1, 'Choose the payment date.'),
    payment_method: z.enum([
      '',
      'cash',
      'mtn_momo',
      'airtel_money',
      'bank_transfer',
      'card',
      'cheque',
      'other',
    ]),
    payment_reference: z.string().trim().max(120, 'Keep the reference under 120 characters.'),
    description: z.string().trim().max(500, 'Keep this under 500 characters.'),
    outstanding_balance: z
      .string()
      .trim()
      .refine(
        (v) => v === '' || (!Number.isNaN(amountInputNumber(v)) && amountInputNumber(v) >= 0),
        'Enter a balance of zero or more.',
      ),
    notes: z.string().trim().max(2000, 'Keep this under 2,000 characters.'),
    confirmed: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (!v.linked) {
      checkRecipient(v, ctx);
      if (!v.description) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['description'],
          message: 'Say what this payment was for.',
        });
      }
    }
    if (!v.payment_method) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['payment_method'],
        message: 'Choose how you were paid.',
      });
    }
    if (v.payment_date > kampalaToday()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['payment_date'],
        message: 'The payment date cannot be later than today.',
      });
    }
    if (!v.confirmed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmed'],
        message: 'Confirm that you have received this payment.',
      });
    }
  });

export type ReceiptFormValues = RecipientValues & {
  linked: boolean;
  currency: string;
  amount: string;
  payment_date: string;
  payment_method: '' | ReceiptPaymentMethod;
  payment_reference: string;
  description: string;
  outstanding_balance: string;
  notes: string;
  confirmed: boolean;
};

export function emptyReceiptValues(
  linked: { currency: string; balanceDue: number } | null,
): ReceiptFormValues {
  return {
    ...emptyRecipient,
    linked: !!linked,
    currency: linked?.currency ?? 'UGX',
    amount: linked ? String(linked.balanceDue) : '',
    payment_date: kampalaToday(),
    payment_method: '',
    payment_reference: '',
    description: '',
    outstanding_balance: '',
    notes: '',
    confirmed: false,
  };
}

const blank = (s: string) => (s.trim() === '' ? null : s.trim());

export function receiptPayload(
  v: ReceiptFormValues,
  opts: { invoiceId: string | null; idempotencyKey: string },
) {
  const common = {
    idempotency_key: opts.idempotencyKey,
    confirmed: v.confirmed,
    amount: cleanAmountInput(v.amount),
    payment_date: v.payment_date,
    payment_method: v.payment_method,
    payment_reference: blank(v.payment_reference),
    description: blank(v.description),
    notes: blank(v.notes),
  };
  if (opts.invoiceId) return { ...common, invoice_id: opts.invoiceId };
  return {
    ...common,
    ...recipientPayload(v),
    currency: v.currency,
    outstanding_balance: blank(cleanAmountInput(v.outstanding_balance)),
  };
}

/** Methods where a transaction id exists and is worth asking for. */
export function wantsReference(method: ReceiptFormValues['payment_method']): boolean {
  return method !== '' && method !== 'cash';
}
