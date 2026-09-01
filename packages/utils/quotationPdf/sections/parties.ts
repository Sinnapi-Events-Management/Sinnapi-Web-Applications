import type { jsPDF } from 'jspdf';
import { COLOR, CONTENT_WIDTH, FONT, PAGE } from '../theme';
import { formatDate } from '../format';
import type { QuotationPdfDocument } from '../document';

/** Small caps-ish label above every value on the page. */
function label(pdf: jsPDF, text: string, x: number, y: number): void {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT.micro);
  pdf.setTextColor(...COLOR.brand);
  pdf.text(text.toUpperCase(), x, y);
}

function value(pdf: jsPDF, text: string, x: number, y: number, maxWidth: number): number {
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(FONT.body);
  pdf.setTextColor(...COLOR.text);
  const lines = pdf.splitTextToSize(text, maxWidth);
  pdf.text(lines, x, y);
  return lines.length * 12;
}

/**
 * Who the offer is from, who it is to, and the four dates that bound it.
 *
 * "From" is the vendor and "to" is the client, which is the direction a
 * quotation actually travels — the old layout listed both as bare `Vendor:` /
 * `Client:` meta lines among the timestamps, which reads as filing metadata
 * rather than as the two parties to an offer.
 *
 * Returns the y the next section starts at.
 */
export function drawParties(pdf: jsPDF, doc: QuotationPdfDocument, startY: number): number {
  const left = PAGE.margin;
  const colWidth = (CONTENT_WIDTH - 24) / 2;
  const rightCol = left + colWidth + 24;

  label(pdf, 'From', left, startY);
  label(pdf, 'To', rightCol, startY);
  const fromHeight = value(pdf, doc.vendor_name ?? '—', left, startY + 14, colWidth);
  const toHeight = value(pdf, doc.client_name ?? '—', rightCol, startY + 14, colWidth);

  let y = startY + 14 + Math.max(fromHeight, toHeight) + 8;

  if (doc.event_title) {
    label(pdf, 'Event', left, y);
    y += 14 + value(pdf, doc.event_title, left, y + 14, CONTENT_WIDTH) + 8;
  }

  // The dates sit in a tinted panel rather than as another list of lines: they
  // are the document's fine print, and a reader looking for the total should be
  // able to skip the whole block in one glance.
  const panelY = y;
  const panelHeight = 46;
  pdf.setFillColor(...COLOR.panel);
  pdf.roundedRect(left, panelY, CONTENT_WIDTH, panelHeight, 4, 4, 'F');

  const dates: [string, string][] = [
    ['Issued', formatDate(doc.created_at)],
    ['Sent', doc.sent_at ? formatDate(doc.sent_at) : 'Not sent'],
    ['Valid until', doc.valid_until ? formatDate(doc.valid_until) : 'No expiry'],
  ];
  const cellWidth = CONTENT_WIDTH / dates.length;
  dates.forEach(([name, text], i) => {
    const x = left + i * cellWidth + 14;
    label(pdf, name, x, panelY + 18);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(FONT.body);
    pdf.setTextColor(...COLOR.text);
    pdf.text(text, x, panelY + 33);
  });

  return panelY + panelHeight + 22;
}
