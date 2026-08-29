import type { jsPDF } from 'jspdf';
import { COLOR, CONTENT_WIDTH, FONT, PAGE } from '../theme';
import type { QuotationPdfDocument } from '../document';

/**
 * What the client asked for, above the prices quoted against it.
 *
 * `request_details` is already on the quotation and has never reached the
 * document. Without it the PDF is a list of amounts with no statement of what
 * is being bought — which is the first thing anyone reviewing a quote against
 * an invoice a month later goes looking for.
 *
 * Draws nothing, and consumes no vertical space, when the quote carries no
 * brief. Returns the y the next section starts at.
 */
export function drawScope(pdf: jsPDF, doc: QuotationPdfDocument, startY: number): number {
  const text = doc.request_details?.trim();
  if (!text) return startY;

  const left = PAGE.margin;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT.micro);
  pdf.setTextColor(...COLOR.brand);
  pdf.text('SCOPE', left, startY);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(FONT.body);
  pdf.setTextColor(...COLOR.text);
  const lines = pdf.splitTextToSize(text, CONTENT_WIDTH);
  pdf.text(lines, left, startY + 14);

  return startY + 14 + lines.length * 12 + 14;
}
