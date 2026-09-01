import type { jsPDF } from 'jspdf';
import { SINNAPI_LOGO_ASPECT, SINNAPI_LOGO_PNG } from '../brand';
import { COLOR, CONTENT_WIDTH, FONT, PAGE } from '../theme';
import { statusTone } from '../status';
import type { QuotationPdfDocument } from '../document';

const LOGO_WIDTH = 104;
const LOGO_HEIGHT = LOGO_WIDTH / SINNAPI_LOGO_ASPECT;

/** The pill's own padding; the width is measured from the label inside it. */
const PILL_PAD_X = 8;
const PILL_HEIGHT = 16;

function drawStatusPill(pdf: jsPDF, doc: QuotationPdfDocument, rightX: number, y: number): void {
  const tone = statusTone(doc.status);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT.micro);
  const width = pdf.getTextWidth(tone.label) + PILL_PAD_X * 2;

  pdf.setFillColor(...tone.fill);
  pdf.roundedRect(rightX - width, y, width, PILL_HEIGHT, 8, 8, 'F');
  pdf.setTextColor(...tone.ink);
  pdf.text(tone.label, rightX - width / 2, y + PILL_HEIGHT / 2, {
    align: 'center',
    baseline: 'middle',
  });
}

/**
 * The masthead: the Sinnapi wordmark, what the document is, which one it is,
 * and where it stands — then a gold rule closing the block.
 *
 * The mark is the real asset rather than the word "Sinnapi" set in Helvetica.
 * This document leaves the platform the moment it is generated: it is forwarded
 * to accountants, printed for signature and attached to disputes, and in every
 * one of those places it is the only Sinnapi surface in the room.
 *
 * Returns the y the next section starts at.
 */
export function drawHeader(pdf: jsPDF, doc: QuotationPdfDocument): number {
  const left = PAGE.margin;
  const right = PAGE.margin + CONTENT_WIDTH;
  const top = PAGE.margin;

  pdf.addImage(SINNAPI_LOGO_PNG, 'PNG', left, top, LOGO_WIDTH, LOGO_HEIGHT);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT.title);
  pdf.setTextColor(...COLOR.brand);
  pdf.text('QUOTATION', right, top + 16, { align: 'right' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(FONT.body);
  pdf.setTextColor(...COLOR.muted);
  // The reference is what both sides quote at each other in correspondence, so
  // it sits directly under the title rather than among the dates below.
  const reference = doc.reference_no ?? doc.id;
  const version = doc.version_no && doc.version_no > 1 ? `  ·  v${doc.version_no}` : '';
  pdf.text(`${reference}${version}`, right, top + 30, { align: 'right' });

  drawStatusPill(pdf, doc, right, top + 38);

  const ruleY = top + Math.max(LOGO_HEIGHT, 62) + 10;
  pdf.setFillColor(...COLOR.accent);
  pdf.rect(left, ruleY, CONTENT_WIDTH, 2.5, 'F');

  return ruleY + 24;
}
