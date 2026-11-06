/**
 * The copy for every refusal the invoice/receipt functions raise.
 *
 * The database raises `code: sentence`. Passing this map to
 * `rpcErrorMessage(error, DOCUMENT_ERROR_COPY)` shows the sentence without
 * the code, and keeps the wording here where it can be edited without a
 * migration.
 */
import { rpcErrorMessage } from '../molecules/rpcError';

export const DOCUMENT_ERROR_COPY: Readonly<Record<string, string>> = {
  invoice_locked: 'An issued invoice cannot be edited. Void it and issue a new one.',
  receipt_locked: 'A receipt cannot be edited. Void it and record the payment again.',
  issue_date_in_future: 'The issue date cannot be later than today.',
  due_before_issue: 'The due date cannot be before the issue date.',
  recipient_ambiguous: 'Choose a Sinnapi client or a saved client, not both.',
  recipient_required: 'Add who this document is for.',
  client_not_eligible: 'You can only bill Sinnapi clients you have a quote or booking with.',
  currency_unsupported: 'That currency is not available.',
  discount_out_of_range: 'A percentage discount must be between 0 and 100.',
  discount_exceeds_subtotal: 'The discount is larger than the items it applies to.',
  tax_rate_out_of_range: 'A tax rate must be above 0 and at most 100%.',
  too_many_items: 'An invoice can have at most 200 lines.',
  item_description_required: 'Every line needs a description.',
  item_quantity_invalid: 'Quantities must be more than zero.',
  item_price_invalid: 'Prices cannot be negative.',
  items_required: 'Add at least one item before issuing.',
  invoice_total_zero: 'An invoice must be for more than zero.',
  booking_not_invoiceable: 'A booking can be invoiced once it is confirmed.',
  booking_unpriced: 'This booking has no agreed amount yet.',
  booking_amount_mismatch:
    'The quotation total does not match the booking amount. Contact support so we can correct it.',
  invoice_has_receipts: 'This invoice has payments recorded. Void its receipts first.',
  invoice_paid_through_sinnapi: 'This booking has been paid through Sinnapi, so its invoice stays.',
  cannot_duplicate_booking_invoice: 'A booking has one invoice. Create a new invoice instead.',
  receipt_blocked_escrow:
    'This booking is paid through Sinnapi. Sinnapi’s payment confirmation is the client’s receipt.',
  invoice_not_payable: 'Payments can only be recorded against an issued, unpaid invoice.',
  payment_before_issue: 'The payment date cannot be before the invoice date.',
  payment_date_in_future: 'The payment date cannot be later than today.',
  payment_method_required: 'Choose how you were paid.',
  amount_invalid: 'The amount received must be more than zero.',
  amount_exceeds_balance: 'That is more than is still owed on this invoice.',
  confirmation_required: 'Confirm that you have received this payment.',
  description_required: 'Say what this payment was for.',
  balance_invalid: 'The outstanding balance cannot be negative.',
  reason_required: 'Give a reason.',
  daily_email_limit_reached: 'You have reached today’s email limit. Try again tomorrow.',
  document_not_sendable: 'Only an issued document can be emailed.',
  recipient_email_required: 'Add an email address for this client.',
  recipient_unreachable: 'This client has no email address on Sinnapi.',
  attachment_missing: 'The PDF was not ready yet. Try again.',
  email_failed: 'The email could not be sent. Try again shortly.',
  logo_required: 'Add your business logo before sending documents to clients.',
  optimistic_lock_conflict: 'This was changed somewhere else. Reload and try again.',
  not_found: 'This document could not be found.',
};

/** The message to show for a failed invoice/receipt call. */
export function documentErrorMessage(error: unknown, fallback?: string): string {
  return rpcErrorMessage(error, DOCUMENT_ERROR_COPY, fallback ? { fallback } : {});
}
