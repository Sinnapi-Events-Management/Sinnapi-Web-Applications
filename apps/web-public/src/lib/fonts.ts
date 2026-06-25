import { Inter, Fraunces } from 'next/font/google';

/**
 * Web-public typography — single source of truth for the brand typefaces.
 *
 * Tier 1 — Latin brand layer (loaded for every visitor):
 *   - body / UI → Inter    (`--font-inter`)   humanist sans, screen-optimized
 *   - display   → Fraunces (`--font-fraunces`) editorial serif for headings
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
 *     // Then extend the stacks, e.g. body: `var(--font-inter), var(--font-noto-arabic), …`.
 */

// Latin body / UI. Variable font → full weight range, no explicit `weight` needed.
// `fallback` feeds next/font's metric-adjusted @font-face so the swap from the
// system fallback to Inter causes minimal layout shift (better CLS).
export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  fallback: ['Helvetica Neue', 'Arial', 'sans-serif'],
});

// Latin display / headings.
export const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  weight: ['400', '600'],
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});

/** Space-separated CSS-variable classNames to spread on `<html>`. */
export const fontVariables = `${inter.variable} ${fraunces.variable}`;

/**
 * CSS font stacks consumed by the MUI theme (`lib/theme.ts`). Keep the leading
 * `var(--font-*)` in sync with the `variable` names above. Append Noto variables
 * here (per active locale) when Tier 2 scripts are introduced.
 */
export const fontStacks = {
  body: 'var(--font-inter), Helvetica, Arial, sans-serif',
  display: 'var(--font-fraunces), Georgia, serif',
} as const;
