import { palette } from '@sinnapi/ui/tokens';

/** jsPDF takes colour as an RGB triple, never a hex string. */
export type Rgb = [number, number, number];

/**
 * `#RRGGBB` — and `#RRGGBBAA`, whose alpha byte is dropped. A PDF page has no
 * compositing model to spend it on, and one token in the palette carries one.
 */
function rgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * The document's palette, read from the design tokens rather than restated.
 *
 * `@sinnapi/ui/tokens` is pure data — no React, no MUI — and says so at the top
 * of the file precisely so non-React consumers like this one can use it. The
 * alternative is a fourth copy of the brand's teal and gold, which is how the
 * portals ended up with three drifting status-colour maps before that map was
 * hoisted into the design system.
 *
 * Light-scheme tokens only: paper is white in every mode.
 */
const light = palette.light;

export const COLOR = {
  /** Sinnapi teal — headings, the table head, the wordmark's own ink. */
  brand: rgb(light.primary.main),
  brandDeep: rgb(light.primary.dark),
  /** Gold — the rule under the header and the band behind the total. */
  accent: rgb(light.secondary.main),
  accentTint: rgb(light.secondary.lighter),
  text: rgb(light.text.primary),
  muted: rgb(light.text.secondary),
  /** Row banding and panel fills, a shade off white so print keeps them. */
  surface: rgb(light.background.default),
  panel: rgb(light.primary.lightest),
  line: [219, 214, 226] as Rgb,
  paper: [255, 255, 255] as Rgb,
  success: rgb(light.success.main),
  warning: rgb(light.warning.main),
  danger: rgb(light.error.main),
} as const;

/**
 * A4 in points, and the frame everything is laid out inside.
 *
 * Points rather than millimetres because jsPDF's text baseline, autoTable's
 * padding and the font sizes are all in points already, and mixing the two is
 * how a layout ends up a millimetre out at the bottom of every page.
 */
export const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 48,
} as const;

export const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
/** Where the footer rule sits, and the floor every section must stay above. */
export const FOOTER_Y = PAGE.height - 46;
export const CONTENT_BOTTOM = FOOTER_Y - 18;

export const FONT = {
  family: 'helvetica',
  title: 22,
  section: 9,
  body: 9.5,
  small: 8,
  micro: 7.5,
} as const;
