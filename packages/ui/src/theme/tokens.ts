/**
 * Sinnapi design tokens — single source of truth for color, radius, spacing.
 * Pure data (no React / no MUI), so this file is safe to import anywhere,
 * including build scripts and non-React contexts.
 */

export const palette = {
  light: {
    mode: 'light',
    // `lightest`/`lighter` are pale tints above `light`, for subtle surfaces/backgrounds.
    primary: {
      lightest: '#E2F0F1',
      lighter: '#8CC3C8',
      light: '#3F9BA3',
      main: '#07504D',
      dark: '#053837',
      contrastText: '#FFFFFF',
    },
    // Gold deepened from #B9890F so white label text clears WCAG AA (4.7:1);
    // contained primary/secondary buttons therefore render white via contrastText.
    secondary: {
      lightest: '#FEF8E8',
      lighter: '#FAE3A2',
      light: '#F6D064',
      main: '#c8973a',
      dark: '#a2770a',
      contrastText: '#FFFFFF',
    },
    success: {
      lightest: '#E7F4E8',
      lighter: '#9FD4A4',
      light: '#5FB868',
      main: '#2E7D32',
      dark: '#1B5E20',
      contrastText: '#FFFFFF',
    },
    warning: {
      lightest: '#FFF4E3',
      lighter: '#FFD391',
      light: '#FFB547',
      main: '#ED6C02',
      dark: '#B53D00',
      contrastText: '#1A1320',
    },
    error: {
      lightest: '#FDE5E5',
      lighter: '#F59896',
      light: '#EF5350',
      main: '#D32F2F',
      dark: '#9A1B1B',
      contrastText: '#FFFFFF',
    },
    info: {
      lightest: '#E5F6FE',
      lighter: '#95DBFA',
      light: '#4FC3F7',
      main: '#0288D1',
      dark: '#01579B',
      contrastText: '#FFFFFF',
    },
    background: { default: '#FAF9FB', paper: '#FFFFFF' },
    text: { primary: '#1A1320', secondary: '#5C5468', disabled: '#A8A0B5' },
    divider: 'rgba(26,19,32,0.12)',
  },
  dark: {
    mode: 'dark',
    primary: {
      lightest: '#ECF6F6',
      lighter: '#B2DCDA',
      light: '#7FC4C1',
      main: '#3F9BA3',
      dark: '#07504D',
      contrastText: '#1A1320',
    },
    secondary: {
      lightest: '#FEFAEF',
      lighter: '#FCECBE',
      light: '#FADF92',
      main: '#F6D064',
      dark: '#D4A017',
      contrastText: '#1A1320',
    },
    success: { lightest: '#E7F4E8', lighter: '#9FD4A4', main: '#5FB868' },
    warning: { lightest: '#FFF4E3', lighter: '#FFD391', main: '#FFB547' },
    error: { lightest: '#FDE5E5', lighter: '#F59896', main: '#EF5350' },
    info: { lightest: '#E5F6FE', lighter: '#95DBFA', main: '#4FC3F7' },
    background: { default: '#100B16', paper: '#1A1320' },
    text: { primary: '#F2F0F4', secondary: '#A8A0B5', disabled: '#5C5468' },
    divider: 'rgba(242,240,244,0.12)',
  },
} as const;

/**
 * Absolute black & white. MUI exposes these as `theme.palette.common`, but the
 * palette only exists at runtime inside a React/theme context. This token gives
 * the same hexes to non-theme call sites (e.g. Server Components composing an
 * overlay with `alpha(common.white, 0.85)`) so white/black are token-sourced too.
 */
export const common = { white: '#FFFFFF', black: '#000000' } as const;

/**
 * Solid color stops for decorative marketing gradients/overlays (hero + CTAs).
 * They sit outside the semantic palette because they never recolor with the
 * scheme — components compose the final translucent layer with `alpha()` at the
 * call site rather than inlining `rgba()`. Kept here so the hex values still
 * have a single source of truth.
 */
export const gradientStops = {
  tealDeep: '#042E2C', // hero overlay start — one shade below primary.dark
  gold: '#B9890F', // vendor CTA gradient (brand gold before AA-deepening)
  goldDark: '#946D0B', // vendor CTA gradient
  goldDeep: '#634908', // vendor CTA dark-mode gradient
  neutralDeep: '#232323', // dark-mode photo overlay neutral
} as const;

/**
 * Compose a translucent color from a solid hex token + opacity, returning an
 * `rgba()` string. Pure (no MUI/React), so Server Components can call it during
 * render with NO `'use client'` boundary — the SSR/SEO-safe equivalent of MUI's
 * `alpha()` for the hex tokens above. Accepts 3- or 6-digit hex.
 *
 * @example withAlpha(common.white, 0.85) // 'rgba(255, 255, 255, 0.85)'
 */
export function withAlpha(hex: string, opacity: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.replace(/./g, '$&$&') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export const radius = { sm: 8, md: 12, pill: 999 } as const;

/**
 * Third-party brand colors that are mandated by an external service and are NOT
 * part of the theme palette (they never change with the color scheme). Kept here
 * so apps reference a token instead of inlining a brand hex.
 */
export const brand = {
  whatsapp: { main: '#25D366', dark: '#1EBE57' },
} as const;

export const fonts = {
  body: 'var(--font-inter), Helvetica, Arial, sans-serif',
  heading: 'var(--font-fraunces), Georgia, serif',
} as const;
