import type { jsPDF } from 'jspdf';
import { vendorContactLines, type VendorSnapshot } from '@sinnapi/ui/documents/core';
import { CONTENT_WIDTH, INK, PAGE, SIZE, type Rgb } from '../theme';
import { pdfText } from '../text';
import { pill, textRight } from '../draw';
import type { PdfLogo } from '../logo';

const LOGO = 46;

export type Stamp = { label: string; fill: Rgb; ink: Rgb } | null;

function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => /[A-Za-z0-9]/.test(p[0] ?? ''));
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

/**
 * The vendor's brand top-left (logo or initials, name, contact lines) and
 * the document's title, number and stamp top-right. Returns where the body
 * starts. The vendor leads; Sinnapi is only in the footer.
 */
export function drawHeader(
  pdf: jsPDF,
  input: {
    vendor: VendorSnapshot;
    logo: PdfLogo | null;
    title: string;
    documentNo: string;
    stamp: Stamp;
  },
): number {
  const left = PAGE.margin;
  const right = PAGE.margin + CONTENT_WIDTH;
  const top = 52;

  // ---------- left: the vendor ----------
  if (input.logo) {
    pdf.addImage(input.logo.dataUrl, 'PNG', left, top, LOGO, LOGO);
  } else {
    pdf.setFillColor(...INK.logoTile);
    pdf.roundedRect(left, top, LOGO, LOGO, 9, 9, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(...INK.muted);
    pdf.text(pdfText(initials(input.vendor.business_name)), left + LOGO / 2, top + LOGO / 2, {
      align: 'center',
      baseline: 'middle',
    });
  }

  const textX = left + LOGO + 12;
  const leftWidth = CONTENT_WIDTH * 0.56 - LOGO - 12;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(SIZE.name);
  pdf.setTextColor(...INK.ink);
  const nameLines = pdf.splitTextToSize(pdfText(input.vendor.business_name), leftWidth) as string[];
  let ly = top + 12;
  nameLines.forEach((line) => {
    pdf.text(line, textX, ly);
    ly += 16;
  });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(SIZE.small);
  pdf.setTextColor(...INK.muted);
  for (const line of vendorContactLines(input.vendor)) {
    for (const wrapped of pdf.splitTextToSize(pdfText(line), leftWidth) as string[]) {
      pdf.text(wrapped, textX, ly);
      ly += 11.5;
    }
  }
  const leftBottom = Math.max(top + LOGO, ly - 4);

  // ---------- right: what this is ----------
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(SIZE.title);
  pdf.setTextColor(...INK.ink);
  textRight(pdf, input.title, right, top + 16, 2.2);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(SIZE.body);
  pdf.setTextColor(...INK.muted);
  textRight(pdf, input.documentNo, right, top + 32);

  let rightBottom = top + 36;
  if (input.stamp) {
    pill(pdf, input.stamp.label, right, top + 40, input.stamp.fill, input.stamp.ink);
    rightBottom = top + 55;
  }

  return Math.max(leftBottom, rightBottom) + 22;
}
