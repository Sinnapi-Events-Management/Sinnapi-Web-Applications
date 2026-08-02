import { Cormorant_Garamond } from 'next/font/google';

/**
 * Web-public typography — single source of truth for the brand typeface.
 *
 * Tier 1 — Latin brand layer (loaded for every visitor):
 *   - body + display → Cormorant Garamond (`--font-cormorant`) editorial serif,
 *     used for every text element (single-font brand identity).
 *
 * Tier 2 — non-Latin, per-locale (NOT shipped yet):
 *   The app currently renders a single English/Latin locale (`<html lang="en">`),
 *   so only the Latin tier is loaded. When locale routing is introduced, add the
 *   matching Noto script fonts here and append their `--font-*` variables to
 *   `fontVariables` *only for the active locale*. CJK files are multi-MB and must
 *   never be shipped to Latin/Arabic visitors, so gate them on the resolved locale.
 *
 *   Latin typefaces never render Arabic/CJK glyphs, so adding these does not touch
 *   the brand layer — each non-Latin script simply falls through the CSS stacks in
 *   `fontStacks` to its dedicated Noto font. Example:
 *
 *     import { Noto_Sans_Arabic, Noto_Sans_SC } from 'next/font/google';
 *     export const notoArabic = Noto_Sans_Arabic({
 *       subsets: ['arabic'], variable: '--font-noto-arabic', display: 'swap',
 *     });
 *     // CJK: load with `adjustFontFallback: false` and gate on locale (large files).
 *     // Then extend the stacks, e.g. body: `var(--font-cormorant), var(--font-noto-arabic), …`.
 */

// Latin body + display. Weights cover every `fontWeight` used across the app's
// typography/sx overrides (400/500/600/700); 800 (e.g. PlanPrice) synthesizes
// from 700 since Cormorant Garamond does not ship an 800 cut.
export const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-cormorant',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});

/** Space-separated CSS-variable classNames to spread on `<html>`. */
export const fontVariables = cormorantGaramond.variable;

/**
 * CSS font stacks consumed by the MUI theme (`lib/theme.ts`). Keep the leading
 * `var(--font-*)` in sync with the `variable` name above. Append Noto variables
 * here (per active locale) when Tier 2 scripts are introduced.
 */
export const fontStacks = {
  body: 'var(--font-cormorant), Georgia, serif',
  display: 'var(--font-cormorant), Georgia, serif',
} as const;
