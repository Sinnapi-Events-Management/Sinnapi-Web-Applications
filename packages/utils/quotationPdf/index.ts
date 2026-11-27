import { jsPDF } from 'jspdf';
import type { QuotationPdfDocument } from './document';
import { CONTENT_BOTTOM, PAGE } from './theme';
import { stampFor } from './status';
import { createPagePainter } from './page';
import { drawWatermark } from './sections/watermark';
import { drawHeader } from './sections/header';
import { drawParties } from './sections/parties';
import { drawScope } from './sections/scope';
import { drawItems } from './sections/items';
import { drawTerms, termsLines } from './sections/terms';
import { drawTotals, totalsHeight } from './sections/totals';
import { drawFooters } from './sections/footer';
import { loadLogo, type PdfLogo } from '../financialPdf/logo';

export type { QuotationPdfDocument, QuotationPdfItem } from './document';
export { canDownloadQuotation, type QuotationViewer } from './access';

/**
 * Render a quotation to a branded PDF document.
 *
 * Quotations are structured data, not stored files, so "Download quotation"
 * builds the document client-side from what the page already holds. Kept
 * framework-free (pure jsPDF) so it can run from any handler without React.
 * The vendor's logo is fetched by `downloadQuotationPdf` and passed in, so
 * this stays synchronous and testable outside a browser.
 *
 * One renderer for all three portals, which is the point of it living here. A
 * vendor filing this with their own books, a client forwarding it to their
 * accountant and an operator attaching it to a dispute must all be looking at
 * the same document — and until now that was maintained by keeping three copies
 * of this file in step by hand.
 *
 * Layout only. Every section takes the y it starts at and returns the y the
 * next one begins at, so a section that has nothing to say (no scope, no
 * advance terms) costs nothing and leaves no gap.
 *
 * Returns the document rather than saving it, so the rendering can be exercised
 * outside a browser — `save()` is the one call in here that needs a DOM.
 */
export function buildQuotationPdf(
  doc: QuotationPdfDocument,
  opts: { logo?: PdfLogo | null } = {},
): jsPDF {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });

  const stamp = stampFor(doc);
  const painter = createPagePainter(pdf, () => drawWatermark(pdf, stamp));

  // Before anything else on page one: the watermark is the bottom layer, and
  // jsPDF paints in call order.
  painter.paint();

  let y = drawHeader(pdf, doc, opts.logo ?? null);
  y = drawParties(pdf, doc, y);
  y = drawScope(pdf, doc, y);
  y = drawItems(pdf, doc, y, painter);

  // The totals and the terms they govern must not be split across a page
  // break: a total stranded on its own page, or terms severed from the figure
  // they qualify, is exactly the confusion this document exists to prevent.
  const tailHeight = totalsHeight(doc) + (termsLines(doc).length ? 70 : 0);
  if (y + tailHeight > CONTENT_BOTTOM) {
    pdf.addPage();
    painter.paint();
    y = PAGE.margin;
  }

  y = drawTotals(pdf, doc, y);
  drawTerms(pdf, doc, y);

  // Last, because "page 1 of N" needs an N.
  drawFooters(pdf, doc);

  return pdf;
}

/** The file name both portals and the console save a quotation under. */
export function quotationFileName(doc: QuotationPdfDocument): string {
  return `quotation-${doc.reference_no ?? doc.id}.pdf`;
}

/**
 * Render a quotation and hand it to the browser's downloads.
 *
 * The entry point every "Download quotation" button calls. Async only to
 * fetch the vendor's logo first (best-effort, capped at a few seconds — a
 * missing logo prints initials, it never blocks the download).
 */
export async function downloadQuotationPdf(doc: QuotationPdfDocument): Promise<void> {
  const logo = await loadLogo(doc.vendor_logo_url);
  buildQuotationPdf(doc, { logo }).save(quotationFileName(doc));
}

/**
 * Render a quotation to a PDF Blob — for previewing in the browser, or for
 * saving the very file that was previewed without rendering it twice.
 */
export async function renderQuotationPdf(doc: QuotationPdfDocument): Promise<Blob> {
  const logo = await loadLogo(doc.vendor_logo_url);
  return buildQuotationPdf(doc, { logo }).output('blob');
}
