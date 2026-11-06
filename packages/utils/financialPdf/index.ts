import type { InvoiceView, ReceiptView } from '@sinnapi/ui/documents/core';
import { buildInvoicePdf } from './invoice';
import { buildReceiptPdf } from './receipt';
import { loadLogo } from './logo';

/**
 * Vendor invoices and receipts as PDF.
 *
 * Mirrors the on-screen `InvoicePreview` / `ReceiptPreview` from
 * `@sinnapi/ui/documents`: same palette, same order, same wording, A4. One
 * renderer for both portals — what a vendor downloads, what their client
 * downloads, and what gets attached to the email are the same file.
 *
 * Built in the browser from the stored record (never from form state), and
 * meant to be loaded with `await import('@sinnapi/utils/financialPdf')` so
 * jsPDF stays out of a portal's first paint.
 *
 * Always light, whatever the app's theme: it is paper.
 */
export { buildInvoicePdf } from './invoice';
export { buildReceiptPdf } from './receipt';
export { loadLogo, type PdfLogo } from './logo';
export { pdfText } from './text';

export function invoiceFileName(invoice: Pick<InvoiceView, 'documentNo'>): string {
  return `Invoice-${invoice.documentNo ?? 'draft'}.pdf`;
}

export function receiptFileName(receipt: Pick<ReceiptView, 'documentNo'>): string {
  return `Receipt-${receipt.documentNo}.pdf`;
}

/** Render an invoice (fetching the vendor's logo first) to a PDF Blob. */
export async function invoicePdfBlob(invoice: InvoiceView): Promise<Blob> {
  const logo = await loadLogo(invoice.vendor.logo_url);
  return buildInvoicePdf(invoice, { logo }).output('blob');
}

/** Render a receipt (fetching the vendor's logo first) to a PDF Blob. */
export async function receiptPdfBlob(receipt: ReceiptView): Promise<Blob> {
  const logo = await loadLogo(receipt.vendor.logo_url);
  return buildReceiptPdf(receipt, { logo }).output('blob');
}

/** Hand a rendered PDF to the browser's downloads. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Render an invoice and save it to the browser's downloads. */
export async function downloadInvoicePdf(invoice: InvoiceView): Promise<void> {
  saveBlob(await invoicePdfBlob(invoice), invoiceFileName(invoice));
}

/** Render a receipt and save it to the browser's downloads. */
export async function downloadReceiptPdf(receipt: ReceiptView): Promise<void> {
  saveBlob(await receiptPdfBlob(receipt), receiptFileName(receipt));
}
