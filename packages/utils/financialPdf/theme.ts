import { PAPER } from '@sinnapi/ui/documents/core';
import { PAGE, CONTENT_WIDTH, FOOTER_Y, CONTENT_BOTTOM } from '../quotationPdf/theme';

export { PAGE, CONTENT_WIDTH, FOOTER_Y, CONTENT_BOTTOM };

export type Rgb = [number, number, number];

function rgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * The on-screen preview's palette (`PAPER` in the documents kit), as the RGB
 * triples jsPDF takes. One palette, so the PDF and the preview cannot drift.
 */
export const INK = {
  ink: rgb(PAPER.ink),
  muted: rgb(PAPER.muted),
  body: rgb(PAPER.body),
  rule: rgb(PAPER.rule),
  hairline: rgb(PAPER.hairline),
  accent: rgb(PAPER.accent),
  band: rgb(PAPER.band),
  logoTile: rgb(PAPER.logoTile),
  warningInk: rgb(PAPER.warningInk),
  warningTint: rgb(PAPER.warningTint),
  successInk: rgb(PAPER.successInk),
  successTint: [231, 244, 232] as Rgb,
  neutralTint: [241, 238, 243] as Rgb,
  voidInk: rgb(PAPER.voidInk),
  voidTint: [253, 229, 229] as Rgb,
  white: [255, 255, 255] as Rgb,
};

/** Where content resumes on a continuation page, under the gold rule. */
export const TOP = 56;

export const SIZE = {
  name: 14,
  title: 22,
  body: 9.5,
  small: 8.5,
  label: 7.5,
} as const;
