import type { jsPDF } from 'jspdf';
import { COLOR, CONTENT_WIDTH, FONT, PAGE } from '../theme';
import { formatMoney } from '../format';
import type { QuotationPdfDocument } from '../document';

const BLOCK_WIDTH = 250;
const ROW_HEIGHT = 18;
const TOTAL_HEIGHT = 30;

/** The height this block needs, so the caller can decide about a page break. */
export function totalsHeight(doc: QuotationPdfDocument): number {
  return rowsFor(doc).length * ROW_HEIGHT + TOTAL_HEIGHT + 8;
}

/**
 * Zero rows are dropped rather than printed.
 *
 * "Discount USh 0" and "Tax USh 0" told the reader nothing and took two of the
 * four lines in the most-read block on the page. A quote with neither now shows
 * subtotal and total, which is the whole truth of it.
 */
function rowsFor(doc: QuotationPdfDocument): [string, number | null][] {
  const rows: [string, number | null][] = [['Subtotal', doc.subtotal]];
  if (doc.discount_total) rows.push(['Discount', -Math.abs(doc.discount_total)]);
  if (doc.tax_total) rows.push(['Tax', doc.tax_total]);
  return rows;
}

/**
 * What it comes to, set against the right margin under the line items.
 *
 * The total gets a gold band and a larger face because it is the one figure on
 * the page anybody opens the document for. Everything above it is the working.
 *
 * Returns the y the next section starts at.
 */
export function drawTotals(pdf: jsPDF, doc: QuotationPdfDocument, startY: number): number {
  const currency = doc.currency ?? 'UGX';
  const left = PAGE.margin + CONTENT_WIDTH - BLOCK_WIDTH;
  const right = PAGE.margin + CONTENT_WIDTH;
  const labelX = left + 14;
  const valueX = right - 14;

  let y = startY;
  pdf.setFontSize(FONT.body);
  for (const [name, amount] of rowsFor(doc)) {
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...COLOR.muted);
    pdf.text(name, labelX, y + 12);
    pdf.setTextColor(...COLOR.text);
    pdf.text(formatMoney(amount, currency), valueX, y + 12, { align: 'right' });
    y += ROW_HEIGHT;
  }

  pdf.setFillColor(...COLOR.accentTint);
  pdf.roundedRect(left, y, BLOCK_WIDTH, TOTAL_HEIGHT, 4, 4, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT.small);
  pdf.setTextColor(...COLOR.brandDeep);
  pdf.text('TOTAL', labelX, y + TOTAL_HEIGHT / 2, { baseline: 'middle' });
  pdf.setFontSize(13);
  pdf.text(formatMoney(doc.total, currency), valueX, y + TOTAL_HEIGHT / 2, {
    align: 'right',
    baseline: 'middle',
  });

  return y + TOTAL_HEIGHT + 24;
}
