import { GState, type jsPDF } from 'jspdf';
import { SINNAPI_FOOTER } from '@sinnapi/ui/documents/core';
import { CONTENT_WIDTH, FOOTER_Y, INK, PAGE } from '../theme';
import { pdfText } from '../text';

/**
 * Drawn last, on every page, because "Page 1 of N" needs N: the thin gold
 * line across the top, the footer rule, the Sinnapi credit, the document
 * number with the page count — and, on a voided document, the VOID mark.
 */
export function drawPageFurniture(pdf: jsPDF, documentNo: string, isVoid: boolean): void {
  const total = pdf.getNumberOfPages();
  const left = PAGE.margin;
  const right = PAGE.margin + CONTENT_WIDTH;

  for (let page = 1; page <= total; page += 1) {
    pdf.setPage(page);

    pdf.setFillColor(...INK.accent);
    pdf.rect(0, 0, PAGE.width, 4.5, 'F');

    pdf.setDrawColor(...INK.rule);
    pdf.setLineWidth(0.6);
    pdf.line(left, FOOTER_Y, right, FOOTER_Y);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...INK.muted);
    pdf.text(pdfText(SINNAPI_FOOTER), left, FOOTER_Y + 14);
    pdf.text(pdfText(`${documentNo}  ·  Page ${page} of ${total}`), right, FOOTER_Y + 14, {
      align: 'right',
    });

    if (isVoid) {
      pdf.saveGraphicsState();
      pdf.setGState(new GState({ opacity: 0.12 }));
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(110);
      pdf.setTextColor(...INK.voidInk);
      pdf.text('VOID', PAGE.width / 2, PAGE.height / 2, {
        angle: 28,
        align: 'center',
        baseline: 'middle',
      });
      pdf.restoreGraphicsState();
    }
  }
}
