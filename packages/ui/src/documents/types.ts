/**
 * The shapes of vendor invoices and receipts, as the database returns them
 * (`*Row`) and as a document is drawn (`*View`). Shared by the vendor portal,
 * the client portal and the PDF renderer, so a document reads the same
 * wherever it is opened.
 *
 * Pure types — no React, no MUI — so `@sinnapi/utils` can import them.
 */

export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'void';
export type ReceiptStatus = 'issued' | 'void';
export type InvoicePaymentChannel = 'vendor_collected' | 'sinnapi_escrow';
export type InvoiceItemKind = 'item' | 'charge';
export type DiscountKind = 'percentage' | 'fixed';
export type ReceiptPaymentMethod =
  | 'cash'
  | 'mtn_momo'
  | 'airtel_money'
  | 'bank_transfer'
  | 'card'
  | 'cheque'
  | 'other';

/** PostgREST returns numeric columns as numbers or strings depending on size. */
export type Numeric = number | string;

/** The vendor's business details, frozen onto a document when it is issued. */
export type VendorSnapshot = {
  business_name: string;
  logo_url?: string | null;
  location?: string | null;
  city?: string | null;
  phone?: string | null;
  website?: string | null;
  registration_no?: string | null;
  tax_id?: string | null;
  email?: string | null;
};

export type InvoiceItemRow = {
  id?: string;
  kind: InvoiceItemKind;
  description: string;
  quantity: Numeric;
  unit_price: Numeric;
  line_total: Numeric;
  sort_order?: number;
};

export type InvoiceRow = {
  id: string;
  vendor_id: string;
  document_no: string | null;
  status: InvoiceStatus;
  payment_channel: InvoicePaymentChannel;
  client_id: string | null;
  contact_id: string | null;
  recipient_name: string | null;
  recipient_company: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_address: string | null;
  booking_id: string | null;
  quotation_id: string | null;
  title: string | null;
  vendor_snapshot: VendorSnapshot | null;
  show_vendor_tax_id: boolean;
  issue_date: string;
  due_date: string;
  payment_instructions: string | null;
  notes: string | null;
  terms: string | null;
  currency: string;
  subtotal: Numeric;
  discount_type: DiscountKind | null;
  discount_value: Numeric | null;
  discount_total: Numeric;
  charges_total: Numeric;
  tax_label: string | null;
  tax_rate: Numeric | null;
  tax_inclusive: boolean;
  tax_total: Numeric;
  total: Numeric;
  amount_paid: Numeric;
  balance_due: Numeric;
  issued_at: string | null;
  paid_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
  version: number;
  vendor_invoice_items?: InvoiceItemRow[];
};

export type ReceiptRow = {
  id: string;
  vendor_id: string;
  document_no: string;
  status: ReceiptStatus;
  invoice_id: string | null;
  client_id: string | null;
  contact_id: string | null;
  recipient_name: string;
  recipient_company: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_address: string | null;
  vendor_snapshot: VendorSnapshot;
  show_vendor_tax_id: boolean;
  currency: string;
  amount: Numeric;
  payment_date: string;
  payment_method: ReceiptPaymentMethod;
  payment_reference: string | null;
  description: string;
  notes: string | null;
  balance_before: Numeric | null;
  balance_after: Numeric | null;
  vendor_confirmed_at: string;
  issued_at: string;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
  /** Embedded when the receipt is linked: `vendor_invoices(document_no,total)`. */
  vendor_invoices?: { document_no: string | null; total: Numeric } | null;
};

export type DeliveryRow = {
  id: string;
  invoice_id: string | null;
  receipt_id: string | null;
  recipient_kind: 'client_account' | 'address';
  recipient_display: string;
  subject: string;
  status: 'sending' | 'sent' | 'failed';
  error: string | null;
  created_at: string;
  sent_at: string | null;
};

export type ContactRow = {
  id: string;
  vendor_id: string;
  full_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  source: 'auto' | 'manual';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

/** Who a document is addressed to, as printed. */
export type DocumentParty = {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

export type InvoiceLineView = {
  kind: InvoiceItemKind;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

/** Everything an invoice preview or PDF prints, already resolved to numbers. */
export type InvoiceView = {
  documentNo: string | null;
  status: InvoiceStatus;
  paymentChannel: InvoicePaymentChannel;
  title: string | null;
  issueDate: string;
  dueDate: string;
  currency: string;
  vendor: VendorSnapshot;
  recipient: DocumentParty;
  items: InvoiceLineView[];
  charges: InvoiceLineView[];
  subtotal: number;
  discountLabel: string | null;
  discountTotal: number;
  taxLabel: string | null;
  taxInclusive: boolean;
  taxTotal: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  paymentInstructions: string | null;
  notes: string | null;
  terms: string | null;
  voidReason: string | null;
};

export type ReceiptView = {
  documentNo: string;
  status: ReceiptStatus;
  paymentDate: string;
  currency: string;
  amount: number;
  paymentMethod: ReceiptPaymentMethod;
  paymentReference: string | null;
  description: string;
  notes: string | null;
  vendor: VendorSnapshot;
  recipient: DocumentParty;
  /** Linked receipts only. */
  invoice: { documentNo: string | null; total: number; balanceBefore: number } | null;
  balanceAfter: number | null;
  confirmedAt: string;
  voidReason: string | null;
};
