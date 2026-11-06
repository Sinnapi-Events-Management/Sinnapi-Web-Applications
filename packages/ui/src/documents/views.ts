/**
 * Database rows → the views a preview or a PDF draws. Pure.
 *
 * An issued document prints its frozen `vendor_snapshot`. A draft has none
 * yet, so the caller passes the vendor's live details as `fallbackVendor` —
 * which is exactly what issuing would freeze.
 */
import { toAmount } from './money';
import type {
  InvoiceItemRow,
  InvoiceLineView,
  InvoiceRow,
  InvoiceView,
  ReceiptRow,
  ReceiptView,
  VendorSnapshot,
} from './types';

const EMPTY_VENDOR: VendorSnapshot = { business_name: '' };

function lineView(item: InvoiceItemRow): InvoiceLineView {
  return {
    kind: item.kind,
    description: item.description,
    quantity: toAmount(item.quantity),
    unitPrice: toAmount(item.unit_price),
    lineTotal: toAmount(item.line_total),
  };
}

/** "Discount (5%)", or "Discount" for a fixed amount; null when there is none. */
export function discountLabel(
  type: InvoiceRow['discount_type'],
  value: number | string | null | undefined,
  total: number,
): string | null {
  if (!total) return null;
  if (type === 'percentage') return `Discount (${toAmount(value)}%)`;
  return 'Discount';
}

/** "VAT (18%)" or "VAT (18%, included)"; null when the invoice carries no tax. */
export function taxLabel(
  label: string | null | undefined,
  rate: number | string | null | undefined,
  inclusive: boolean,
): string | null {
  if (rate === null || rate === undefined || rate === '' || !toAmount(rate)) return null;
  const name = label?.trim() || 'Tax';
  return `${name} (${toAmount(rate)}%${inclusive ? ', included' : ''})`;
}

export function toInvoiceView(
  row: InvoiceRow,
  fallbackVendor?: VendorSnapshot | null,
): InvoiceView {
  const lines = [...(row.vendor_invoice_items ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const discountTotal = toAmount(row.discount_total);

  return {
    documentNo: row.document_no,
    status: row.status,
    paymentChannel: row.payment_channel,
    title: row.title,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    currency: row.currency,
    vendor: row.vendor_snapshot ?? fallbackVendor ?? EMPTY_VENDOR,
    recipient: {
      name: row.recipient_name ?? '',
      company: row.recipient_company,
      email: row.recipient_email,
      phone: row.recipient_phone,
      address: row.recipient_address,
    },
    items: lines.filter((l) => l.kind === 'item').map(lineView),
    charges: lines.filter((l) => l.kind === 'charge').map(lineView),
    subtotal: toAmount(row.subtotal),
    discountLabel: discountLabel(row.discount_type, row.discount_value, discountTotal),
    discountTotal,
    taxLabel: taxLabel(row.tax_label, row.tax_rate, row.tax_inclusive),
    taxInclusive: row.tax_inclusive,
    taxTotal: toAmount(row.tax_total),
    total: toAmount(row.total),
    amountPaid: toAmount(row.amount_paid),
    balanceDue: toAmount(row.balance_due),
    paymentInstructions: row.payment_instructions,
    notes: row.notes,
    terms: row.terms,
    voidReason: row.void_reason,
  };
}

export function toReceiptView(row: ReceiptRow): ReceiptView {
  return {
    documentNo: row.document_no,
    status: row.status,
    paymentDate: row.payment_date,
    currency: row.currency,
    amount: toAmount(row.amount),
    paymentMethod: row.payment_method,
    paymentReference: row.payment_reference,
    description: row.description,
    notes: row.notes,
    vendor: row.vendor_snapshot,
    recipient: {
      name: row.recipient_name,
      company: row.recipient_company,
      email: row.recipient_email,
      phone: row.recipient_phone,
      address: row.recipient_address,
    },
    invoice:
      row.invoice_id && row.balance_before !== null
        ? {
            documentNo: row.vendor_invoices?.document_no ?? null,
            total: toAmount(row.vendor_invoices?.total),
            balanceBefore: toAmount(row.balance_before),
          }
        : null,
    balanceAfter: row.balance_after === null ? null : toAmount(row.balance_after),
    confirmedAt: row.vendor_confirmed_at,
    voidReason: row.void_reason,
  };
}

/** The vendor's contact lines under their name, in print order, blanks dropped. */
export function vendorContactLines(v: VendorSnapshot): string[] {
  const place = [v.location, v.city].filter(Boolean).join(', ');
  const reach = [v.phone, v.email, v.website].filter(Boolean).join(' · ');
  const ids = [
    v.registration_no ? `Reg. no. ${v.registration_no}` : null,
    v.tax_id ? `TIN ${v.tax_id}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return [place, reach, ids].filter((s) => s.length > 0);
}

/** The recipient's lines under their name. */
export function partyLines(p: {
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}): string[] {
  return [p.company, p.address, [p.phone, p.email].filter(Boolean).join(' · ')].filter(
    (s): s is string => !!s && s.length > 0,
  );
}
