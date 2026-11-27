import type { jsPDF } from 'jspdf';
import { fitLogo, type PdfLogo } from '../../financialPdf/logo';
import { COLOR, CONTENT_WIDTH, FONT, PAGE } from '../theme';
import { statusTone } from '../status';
import type { QuotationPdfDocument } from '../document';

/** The logo's box — the same proportions invoices and receipts use. */
const LOGO_HEIGHT = 48;
const LOGO_MAX_WIDTH = 150;
/** Wider than this and the logo sits above the name rather than beside it. */
const STACK_ASPECT = 1.6;

/** The pill's own padding; the width is measured from the label inside it. */
const PILL_PAD_X = 8;
const PILL_HEIGHT = 16;

function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => /[A-Za-z0-9]/.test(p[0] ?? ''));
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

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

/** The vendor's logo (or initials) and name. Returns the y beneath it. */
function drawVendorBrand(
  pdf: jsPDF,
  doc: QuotationPdfDocument,
  logo: PdfLogo | null,
  left: number,
  top: number,
): number {
  const name = doc.vendor_name?.trim() || 'Vendor';
  let logoWidth = LOGO_HEIGHT;
  let logoHeight = LOGO_HEIGHT;

  if (logo) {
    ({ width: logoWidth, height: logoHeight } = fitLogo(logo, LOGO_MAX_WIDTH, LOGO_HEIGHT));
    pdf.addImage(logo.dataUrl, 'PNG', left, top, logoWidth, logoHeight);
  } else {
    pdf.setFillColor(...COLOR.surface);
    pdf.roundedRect(left, top, LOGO_HEIGHT, LOGO_HEIGHT, 9, 9, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(...COLOR.muted);
    pdf.text(initials(name), left + LOGO_HEIGHT / 2, top + LOGO_HEIGHT / 2, {
      align: 'center',
      baseline: 'middle',
    });
  }

  const stacked = logoWidth / logoHeight > STACK_ASPECT;
  const textX = stacked ? left : left + logoWidth + 12;
  const maxWidth = CONTENT_WIDTH * 0.56 - (stacked ? 0 : logoWidth + 12);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT.name);
  pdf.setTextColor(...COLOR.text);
  const lines = pdf.splitTextToSize(name, maxWidth) as string[];
  let y = stacked ? top + logoHeight + 18 : top + 18;
  for (const line of lines.slice(0, 2)) {
    pdf.text(line, textX, y);
    y += 16;
  }
  return stacked ? y - 4 : Math.max(top + logoHeight, y - 4);
}

/**
 * The masthead: the vendor's business logo and name on the left, what the
 * document is, which one and where it stands on the right — then a gold rule.
 *
 * The vendor's brand leads, as on their invoices and receipts: this is their
 * offer to their client. Sinnapi is credited in the footer.
 *
 * Returns the y the next section starts at.
 */
export function drawHeader(pdf: jsPDF, doc: QuotationPdfDocument, logo: PdfLogo | null): number {
  const left = PAGE.margin;
  const right = PAGE.margin + CONTENT_WIDTH;
  const top = PAGE.margin;

  const leftBottom = drawVendorBrand(pdf, doc, logo, left, top);

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

  const ruleY = Math.max(leftBottom, top + 62) + 10;
  pdf.setFillColor(...COLOR.accent);
  pdf.rect(left, ruleY, CONTENT_WIDTH, 2.5, 'F');

  return ruleY + 24;
}
