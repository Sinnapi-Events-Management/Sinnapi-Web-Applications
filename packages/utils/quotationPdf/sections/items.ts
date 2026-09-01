import type { jsPDF } from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';
import { COLOR, CONTENT_BOTTOM, FONT, PAGE } from '../theme';
import { formatMoney } from '../format';
import type { QuotationPdfDocument } from '../document';
import type { PagePainter } from '../page';

/**
 * An unpriced draft is a real state; a head with no body reads as a failure.
 *
 * Three empty cells rather than a `colSpan`, which was the obvious way and the
 * wrong one: a spanning cell takes its width from the columns it covers, so
 * autoTable re-solves the whole table and the fixed money columns collapse to
 * fit a sentence. The header then sits at different column widths than every
 * other quotation's.
 */
const EMPTY_ROW: RowInput[] = [['No line items on this quotation.', '', '', '']];

/**
 * The priced lines.
 *
 * autoTable owns the page breaks, which is why the watermark painter is handed
 * to it: when the lines overflow onto a second page, that page has to be
 * stamped before autoTable draws a single row on it, and `willDrawPage` is the
 * only hook that fires early enough.
 *
 * Returns the y the next section starts at.
 */
export function drawItems(
  pdf: jsPDF,
  doc: QuotationPdfDocument,
  startY: number,
  painter: PagePainter,
): number {
  const currency = doc.currency ?? 'UGX';

  const body: RowInput[] = doc.items.length
    ? doc.items.map((item) => [
        item.description ?? '—',
        String(item.quantity ?? 1),
        formatMoney(item.unit_price, currency),
        formatMoney(item.line_total, currency),
      ])
    : EMPTY_ROW;

  autoTable(pdf, {
    startY,
    margin: { left: PAGE.margin, right: PAGE.margin, bottom: PAGE.height - CONTENT_BOTTOM },
    head: [['Description', 'Qty', 'Unit price', 'Line total']],
    body,
    // No cell grid: the rules boxing in every cell were the heaviest thing on
    // the old document, and the numbers are what should read. Rows are
    // separated by a single hairline instead.
    //
    // Not zebra banding, which was the other candidate and is wrong here: the
    // filled rows would chop the watermark underneath into stripes, and a
    // watermark visible through half the table reads as a printing fault rather
    // than as a mark.
    theme: 'plain',
    headStyles: {
      fillColor: COLOR.brand,
      textColor: COLOR.paper,
      fontStyle: 'bold',
      fontSize: FONT.small,
      cellPadding: { top: 7, bottom: 7, left: 8, right: 8 },
    },
    bodyStyles: {
      textColor: COLOR.text,
      fontSize: FONT.body,
      cellPadding: { top: 9, bottom: 9, left: 8, right: 8 },
      lineColor: COLOR.line,
      lineWidth: { bottom: 0.5 },
    },
    // A row is moved whole to the next page rather than split across the break.
    // The descriptions wrap to two lines, and the default leaves the second
    // line stranded at the top of the next page under a repeated header, where
    // it reads as a line item priced at nothing.
    rowPageBreak: 'avoid',
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'right', cellWidth: 44 },
      2: { halign: 'right', cellWidth: 96 },
      3: { halign: 'right', cellWidth: 106, fontStyle: 'bold' },
    },
    willDrawPage: () => painter.paint(),
  });

  // `lastAutoTable` is stamped on the doc by jspdf-autotable after render.
  const finalY = (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
  return (finalY ?? startY) + 18;
}
