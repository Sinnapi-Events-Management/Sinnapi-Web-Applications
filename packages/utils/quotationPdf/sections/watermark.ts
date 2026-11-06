import { GState, type jsPDF } from 'jspdf';
import { COLOR, PAGE } from '../theme';

/** Faint enough to read straight through, dark enough to survive a photocopy. */
const STAMP_OPACITY = 0.1;

/**
 * A status word across the page — DRAFT, EXPIRED, DECLINED, VOID — when the
 * document needs one, and nothing otherwise.
 *
 * No platform mark sits behind the content any more: this is the vendor's
 * document, branded with their logo, and Sinnapi is credited once, in the
 * footer.
 *
 * Drawn first on every page so the content prints over it rather than under it
 * (jsPDF has no z-index — call order is depth). The opacity goes through a
 * saved and restored graphics state, because a `GState` is sticky.
 */
export function drawWatermark(pdf: jsPDF, stamp: string | null): void {
  if (!stamp) return;

  pdf.saveGraphicsState();
  pdf.setGState(new GState({ opacity: STAMP_OPACITY }));
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(76);
  pdf.setTextColor(...COLOR.danger);
  pdf.text(stamp, PAGE.width / 2, PAGE.height / 2, {
    angle: 26,
    align: 'center',
    baseline: 'middle',
  });
  pdf.restoreGraphicsState();
}
