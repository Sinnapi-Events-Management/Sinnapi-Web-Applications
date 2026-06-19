/**
 * Sinnapi design tokens — single source of truth for color, radius, spacing.
 * Pure data (no React / no MUI), so this file is safe to import anywhere,
 * including build scripts and non-React contexts.
 */

export const palette = {
  light: {
    mode: 'light',
    primary: { light: '#3F9BA3', main: '#07504D', dark: '#053837', contrastText: '#FFFFFF' },
    secondary: { light: '#F6D064', main: '#B9890F', dark: '#946D0B', contrastText: '#1A1320' },
    success: { light: '#5FB868', main: '#2E7D32', dark: '#1B5E20', contrastText: '#FFFFFF' },
    warning: { light: '#FFB547', main: '#ED6C02', dark: '#B53D00', contrastText: '#1A1320' },
    error: { light: '#EF5350', main: '#D32F2F', dark: '#9A1B1B', contrastText: '#FFFFFF' },
    info: { light: '#4FC3F7', main: '#0288D1', dark: '#01579B', contrastText: '#FFFFFF' },
    background: { default: '#FAF9FB', paper: '#FFFFFF' },
    text: { primary: '#1A1320', secondary: '#5C5468', disabled: '#A8A0B5' },
    divider: 'rgba(26,19,32,0.12)',
  },
  dark: {
    mode: 'dark',
    primary: { light: '#7FC4C1', main: '#3F9BA3', dark: '#07504D', contrastText: '#1A1320' },
    secondary: { light: '#FADF92', main: '#F6D064', dark: '#D4A017', contrastText: '#1A1320' },
    success: { main: '#5FB868' },
    warning: { main: '#FFB547' },
    error: { main: '#EF5350' },
    info: { main: '#4FC3F7' },
    background: { default: '#100B16', paper: '#1A1320' },
    text: { primary: '#F2F0F4', secondary: '#A8A0B5', disabled: '#5C5468' },
    divider: 'rgba(242,240,244,0.12)',
  },
} as const;

export const radius = { sm: 8, md: 12, pill: 999 } as const;

export const fonts = {
  body: 'var(--font-inter), Helvetica, Arial, sans-serif',
  heading: 'var(--font-fraunces), Georgia, serif',
} as const;
