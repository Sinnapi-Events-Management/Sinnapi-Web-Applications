import type { jsPDF } from 'jspdf';
import { CONTENT_BOTTOM, INK, SIZE, TOP, type Rgb } from './theme';
import { pdfText } from './text';

/** A new page when `needed` points will not fit under `y`; returns where to continue. */
export function ensureSpace(pdf: jsPDF, y: number, needed: number): number {
  if (y + needed <= CONTENT_BOTTOM) return y;
  pdf.addPage();
  return TOP;
}

/** The small spaced capitals above each block. */
export function label(pdf: jsPDF, text: string, x: number, y: number): void {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(SIZE.label);
  pdf.setTextColor(...INK.muted);
  pdf.text(pdfText(text.toUpperCase()), x, y, { charSpace: 0.6 });
}

type Para = {
  size?: number;
  bold?: boolean;
  color?: Rgb;
  lineHeight?: number;
};

/** Wrapped text that does not run past the page; it continues on the next one. */
export function paragraph(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  opts: Para = {},
): number {
  const size = opts.size ?? SIZE.body;
  const lh = opts.lineHeight ?? size * 1.4;
  pdf.setFont('helvetica', opts.bold ? 'bold' : 'normal');
  pdf.setFontSize(size);
  pdf.setTextColor(...(opts.color ?? INK.ink));
  const lines = pdf.splitTextToSize(pdfText(text), width) as string[];
  let cursor = y;
  for (const line of lines) {
    if (cursor > CONTENT_BOTTOM) {
      pdf.addPage();
      cursor = TOP + size;
      pdf.setFont('helvetica', opts.bold ? 'bold' : 'normal');
      pdf.setFontSize(size);
      pdf.setTextColor(...(opts.color ?? INK.ink));
    }
    pdf.text(line, x, cursor);
    cursor += lh;
  }
  return cursor;
}

/** How tall `paragraph` would be, without drawing it. */
export function paragraphHeight(
  pdf: jsPDF,
  text: string,
  width: number,
  size: number = SIZE.body,
): number {
  pdf.setFontSize(size);
  const lines = pdf.splitTextToSize(pdfText(text), width) as string[];
  return lines.length * size * 1.4;
}

/** Text right-aligned at `right`, with letter spacing that `align: 'right'` would ignore. */
export function textRight(pdf: jsPDF, text: string, right: number, y: number, charSpace = 0): void {
  const safe = pdfText(text);
  const width = pdf.getTextWidth(safe) + charSpace * Math.max(safe.length - 1, 0);
  pdf.text(safe, right - width, y, { charSpace });
}

export function pill(
  pdf: jsPDF,
  text: string,
  right: number,
  y: number,
  fill: Rgb,
  ink: Rgb,
): void {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  const safe = pdfText(text);
  const w = pdf.getTextWidth(safe) + 0.6 * (safe.length - 1) + 16;
  const h = 15;
  pdf.setFillColor(...fill);
  pdf.roundedRect(right - w, y, w, h, 7.5, 7.5, 'F');
  pdf.setTextColor(...ink);
  pdf.text(safe, right - w + 8, y + h / 2, { baseline: 'middle', charSpace: 0.6 });
}
