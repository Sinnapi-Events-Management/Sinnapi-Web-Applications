import type { jsPDF } from 'jspdf';

/**
 * Runs a painter exactly once per page, whoever started the page.
 *
 * A watermark has to sit *under* the content, and jsPDF paints in call order
 * with no z-index — so it must be drawn the moment a page begins and never
 * again. Three different things start pages here: the renderer itself for page
 * one, autoTable when the line items overflow, and the totals block when it
 * cannot fit under the table. Without a guard the first page gets its watermark
 * twice (once from us, once from autoTable's `willDrawPage`), which at these
 * opacities is visibly darker than every page after it.
 */
export function createPagePainter(pdf: jsPDF, paint: () => void) {
  const painted = new Set<number>();

  return {
    /** Paint the current page if it has not been painted yet. */
    paint(): void {
      const page = pdf.getCurrentPageInfo().pageNumber;
      if (painted.has(page)) return;
      painted.add(page);
      paint();
    },
  };
}

export type PagePainter = ReturnType<typeof createPagePainter>;
