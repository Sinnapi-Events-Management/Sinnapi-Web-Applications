import { COLOR, type Rgb } from './theme';
import { titleize } from './format';

export type StatusTone = { fill: Rgb; ink: Rgb; label: string };

/**
 * How a quotation's state reads on paper.
 *
 * The same semantics as the portals' status chips — terminal success green,
 * refusal red, in-flight teal, nothing-yet grey — restated here as fills rather
 * than imported, because a chip's colour is a MUI palette *key* and a PDF needs
 * the ink.
 */
export function statusTone(status: string): StatusTone {
  const label = titleize(status).toUpperCase();
  switch (status) {
    case 'accepted':
      return { fill: COLOR.success, ink: COLOR.paper, label };
    case 'declined':
      return { fill: COLOR.danger, ink: COLOR.paper, label };
    case 'revised':
      return { fill: COLOR.warning, ink: COLOR.paper, label };
    case 'sent':
      return { fill: COLOR.brand, ink: COLOR.paper, label };
    default:
      // `draft`, `expired`, `voided` — and anything added server-side that has
      // not reached this file yet. Neutral is the safe reading for a state the
      // document cannot interpret.
      return { fill: COLOR.surface, ink: COLOR.muted, label };
  }
}

/**
 * Whether the quote has run out, independent of the stored status.
 *
 * A quotation expires by the calendar, not by a write: nothing sweeps the table
 * at midnight, so a quote whose `valid_until` passed yesterday is still `sent`
 * in the database. On screen that hardly matters — the page is read live. On
 * paper it matters entirely, because the document outlives the moment it was
 * generated and gets forwarded, printed and quoted back weeks later.
 */
export function isExpired(doc: { status: string; valid_until: string | null }): boolean {
  if (doc.status === 'expired') return true;
  // Only an offer still awaiting an answer can lapse. An accepted quote is a
  // deal that was struck, and stamping EXPIRED across it would be a lie.
  if (doc.status !== 'sent' && doc.status !== 'draft') return false;
  if (!doc.valid_until) return false;
  return new Date(doc.valid_until).getTime() < Date.now();
}

/**
 * The word stamped across the page, or `null` when the document needs no
 * warning. `sent` and `accepted` quotes inside their validity get nothing: a
 * stamp on every page would train the reader to ignore the one that matters.
 */
export function stampFor(doc: { status: string; valid_until: string | null }): string | null {
  if (isExpired(doc)) return 'EXPIRED';
  if (doc.status === 'draft') return 'DRAFT';
  if (doc.status === 'voided') return 'VOID';
  if (doc.status === 'declined') return 'DECLINED';
  return null;
}
