import type { jsPDF } from 'jspdf';
import { COLOR, CONTENT_WIDTH, FONT, PAGE } from '../theme';
import { formatMoney } from '../format';
import type { QuotationPdfDocument } from '../document';

/**
 * The sentences the advance terms come out as.
 *
 * Built before anything is drawn so the caller can measure the block and decide
 * whether it fits on the page — and so a quote carrying no advance terms at all
 * produces an empty list and no section, rather than a heading over nothing.
 *
 * The rate is stored as a fraction and read by humans as a percentage, and the
 * money is spelled out beside it: "40% (USh 720,000)" is a term someone can
 * check against their bank statement, where "40%" is arithmetic they have to do
 * themselves.
 */
export function termsLines(doc: QuotationPdfDocument): string[] {
  const lines: string[] = [];
  const currency = doc.currency ?? 'UGX';

  if (doc.advance_rate != null && doc.advance_rate > 0) {
    const percent = Math.round(doc.advance_rate * 100);
    const amount =
      doc.total != null ? ` (${formatMoney(doc.total * doc.advance_rate, currency)})` : '';
    const when =
      doc.advance_release_days_before != null
        ? ` released ${doc.advance_release_days_before} day${doc.advance_release_days_before === 1 ? '' : 's'} before the event`
        : '';
    lines.push(
      `Advance: ${percent}% of the total${amount}${when}, with the balance on completion.`,
    );
  }

  const note = doc.advance_terms_note?.trim();
  if (note) lines.push(note);

  return lines;
}

/**
 * How and when the money moves, under the total it applies to.
 *
 * These three fields have been on the quotation since advances existed and have
 * never appeared on the document. A quote that states a total but not that 40%
 * of it is released a week before the event is a quote both sides can read
 * differently — and the PDF is the copy that gets forwarded, printed and argued
 * over later.
 *
 * Returns the y the next section starts at.
 */
export function drawTerms(pdf: jsPDF, doc: QuotationPdfDocument, startY: number): number {
  const lines = termsLines(doc);
  if (!lines.length) return startY;

  const left = PAGE.margin;
  const wrapped = lines.flatMap((line) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(FONT.small);
    return pdf.splitTextToSize(line, CONTENT_WIDTH - 28) as string[];
  });
  const height = 26 + wrapped.length * 11 + 12;

  pdf.setFillColor(...COLOR.surface);
  pdf.setDrawColor(...COLOR.line);
  pdf.roundedRect(left, startY, CONTENT_WIDTH, height, 4, 4, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT.micro);
  pdf.setTextColor(...COLOR.brand);
  pdf.text('PAYMENT TERMS', left + 14, startY + 18);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(FONT.small);
  pdf.setTextColor(...COLOR.text);
  pdf.text(wrapped, left + 14, startY + 32);

  return startY + height + 20;
}
