/**
 * What an invoice or receipt is called, and what colour its chip is.
 * Pure data, shared by both portals.
 *
 * "Overdue" is not stored: it is an issued or partly paid invoice whose due
 * date has passed, worked out against Kampala's today like the database's
 * own `vendor_document_summary`.
 */
import type { StatusChipColor } from '../molecules/statusColor';
import { kampalaToday } from './money';
import type { InvoiceStatus, ReceiptPaymentMethod, ReceiptStatus } from './types';

export type InvoiceDisplayStatus = InvoiceStatus | 'overdue';

export const INVOICE_STATUS_META: Readonly<
  Record<InvoiceDisplayStatus, { label: string; color: StatusChipColor }>
> = {
  draft: { label: 'Draft', color: 'default' },
  issued: { label: 'Issued', color: 'info' },
  partially_paid: { label: 'Partly paid', color: 'warning' },
  paid: { label: 'Paid', color: 'success' },
  overdue: { label: 'Overdue', color: 'error' },
  void: { label: 'Void', color: 'default' },
};

export const RECEIPT_STATUS_META: Readonly<
  Record<ReceiptStatus, { label: string; color: StatusChipColor }>
> = {
  issued: { label: 'Received', color: 'success' },
  void: { label: 'Void', color: 'default' },
};

export function invoiceDisplayStatus(
  status: InvoiceStatus,
  dueDate: string | null | undefined,
  today: string = kampalaToday(),
): InvoiceDisplayStatus {
  if (
    (status === 'issued' || status === 'partially_paid') &&
    dueDate &&
    dueDate.slice(0, 10) < today
  ) {
    return 'overdue';
  }
  return status;
}

/** The filter tabs on the invoice list, in the order a vendor works through them. */
export const INVOICE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
  { value: 'draft', label: 'Drafts' },
  { value: 'void', label: 'Void' },
] as const;

export type InvoiceFilter = (typeof INVOICE_FILTERS)[number]['value'];

export const RECEIPT_METHOD_LABELS: Readonly<Record<ReceiptPaymentMethod, string>> = {
  cash: 'Cash',
  mtn_momo: 'MTN Mobile Money',
  airtel_money: 'Airtel Money',
  bank_transfer: 'Bank transfer',
  card: 'Card',
  cheque: 'Cheque',
  other: 'Other',
};

export const RECEIPT_METHOD_OPTIONS = (
  Object.entries(RECEIPT_METHOD_LABELS) as [ReceiptPaymentMethod, string][]
).map(([value, label]) => ({ value, label }));
