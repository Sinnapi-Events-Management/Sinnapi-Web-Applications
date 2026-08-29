import { GState, type jsPDF } from 'jspdf';
import { SINNAPI_LOGO_ASPECT, SINNAPI_LOGO_PNG } from '../brand';
import { COLOR, PAGE } from '../theme';

/** Faint enough to read straight through, dark enough to survive a photocopy. */
const LOGO_OPACITY = 0.05;
const STAMP_OPACITY = 0.1;

/**
 * Wide enough to run past the line-item table on both sides. A mark narrower
 * than the content reads as a smudge *behind the table*; one that overruns it
 * reads as a mark on the paper, which is the whole idea.
 */
const LOGO_WIDTH = 360;
const LOGO_HEIGHT = LOGO_WIDTH / SINNAPI_LOGO_ASPECT;

/**
 * The Sinnapi mark across the page, and a status word over it when the document
 * needs one.
 *
 * Drawn first on every page so the content prints over it rather than under it.
 * jsPDF has no z-index — call order *is* depth — so a watermark added at the
 * end would tint the table text and the totals sitting on top of it.
 *
 * The opacity goes through a graphics state, saved and restored around the
 * whole thing: a `GState` is sticky, and leaving it at 6% would render the next
 * thing drawn on the page — the header — effectively invisible.
 */
export function drawWatermark(pdf: jsPDF, stamp: string | null): void {
  const cx = PAGE.width / 2;
  const cy = PAGE.height / 2;

  pdf.saveGraphicsState();

  pdf.setGState(new GState({ opacity: LOGO_OPACITY }));
  pdf.addImage(
    SINNAPI_LOGO_PNG,
    'PNG',
    cx - LOGO_WIDTH / 2,
    cy - LOGO_HEIGHT / 2,
    LOGO_WIDTH,
    LOGO_HEIGHT,
  );

  if (stamp) {
    pdf.setGState(new GState({ opacity: STAMP_OPACITY }));
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(76);
    pdf.setTextColor(...COLOR.danger);
    // Rotated about its own centre and dropped below the mark, so the word
    // crosses the lower half of the page instead of sitting on the logo.
    pdf.text(stamp, cx, cy + LOGO_HEIGHT * 0.9, { angle: 26, align: 'center', baseline: 'middle' });
  }

  pdf.restoreGraphicsState();
}
