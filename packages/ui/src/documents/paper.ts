/**
 * The colours a printed document is drawn in — always these, in light mode
 * and dark mode alike. A document is paper: dark-mode surfaces would print
 * as a black page and read badly when forwarded.
 *
 * Read from the light-scheme tokens where the brand defines them, so the
 * preview, the PDF and the app share one ink and one gold. Shared by the
 * on-screen preview and the jsPDF renderer in `@sinnapi/utils`.
 */
import { palette } from '../theme/tokens';

const light = palette.light;

export const PAPER = {
  paper: '#FFFFFF',
  ink: light.text.primary,
  muted: light.text.secondary,
  /** Body copy a shade lighter than headings, still well above 4.5:1. */
  body: '#3A3242',
  rule: '#DBD6E2',
  hairline: '#E8E4EC',
  /** Sinnapi gold — the top line only. Never text: it fails contrast on white. */
  accent: light.secondary.main,
  /** The balance-due and amount-received band. */
  band: '#FCF3DA',
  logoTile: '#F3EFE6',
  warningInk: '#9A3A00',
  warningTint: '#FFF4E3',
  successInk: '#1B5E20',
  voidInk: '#9A1B1B',
} as const;

/** Printed documents use the PDF's own font, so the preview matches the file. */
export const PAPER_FONT = 'Helvetica, Arial, sans-serif';

export const SINNAPI_FOOTER = 'Generated using Sinnapi — www.sinnapi.com';
