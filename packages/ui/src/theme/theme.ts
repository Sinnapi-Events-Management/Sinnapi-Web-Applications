'use client';
import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { palette, radius, fonts } from './tokens';

// Extend MUI's palette colors with two extra tints above `light`, so
// `secondary.lighter`, `error.lightest`, etc. resolve in both the `sx` prop and
// `theme.palette.*`. The hex values live in ./tokens (single source of truth).
declare module '@mui/material/styles' {
  interface PaletteColor {
    lighter: string;
    lightest: string;
  }
  interface SimplePaletteColorOptions {
    lighter?: string;
    lightest?: string;
  }
}

// Shared, palette-independent options. Component defaults live here so every
// app gets identical Button/Card/TextField behaviour without per-app overrides.
const shared: ThemeOptions = {
  shape: { borderRadius: radius.sm },
  breakpoints: { values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 } },
  typography: {
    fontFamily: fonts.body,
    h1: {
      fontFamily: fonts.heading,
      fontWeight: 600,
      fontSize: '3.25rem',
      lineHeight: 1.15,
      letterSpacing: '-0.25px',
    },
    h2: {
      fontFamily: fonts.heading,
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
      letterSpacing: '-0.25px',
    },
    h3: { fontFamily: fonts.heading, fontWeight: 700, fontSize: '2rem', lineHeight: 1.25 },
    h4: { fontFamily: fonts.heading, fontWeight: 600, fontSize: '1.5rem', lineHeight: 1.3 },
    h5: { fontFamily: fonts.heading, fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.35 },
    h6: {
      fontFamily: fonts.heading,
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.4,
      letterSpacing: '0.15px',
    },
    // Cormorant Garamond has a notably smaller x-height than Inter (the
    // previous body font), so the MUI/Roboto-tuned default body scale reads
    // visibly smaller at the same nominal size. Body/UI variants are bumped
    // ~1 step up from MUI's defaults to compensate.
    body1: { fontSize: '1.25rem', lineHeight: 1.6 },
    body2: { fontSize: '1.125rem', lineHeight: 1.55 },
    subtitle1: { fontSize: '1.125rem', lineHeight: 1.5 },
    subtitle2: { fontSize: '1rem', lineHeight: 1.5, fontWeight: 500 },
    caption: { fontSize: '0.875rem', lineHeight: 1.4 },
    button: { fontSize: '1.25rem', fontWeight: 600, textTransform: 'none', letterSpacing: '0.3px' },
    overline: { fontSize: '0.8125rem', fontWeight: 600, letterSpacing: '1px' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: radius.sm, minHeight: 44, paddingInline: 20, fontWeight: 600 },
        // MUI hardcodes fontSize per `size` (13px small / 15px large) inside
        // Button itself, overriding typography.button for anything but the
        // default medium size — restate it here so every size stays 1.25rem.
        sizeSmall: { fontSize: '1.25rem' },
        sizeMedium: { fontSize: '1.25rem' },
        sizeLarge: { fontSize: '1.25rem' },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: { fontSize: '1.25rem' },
        sizeSmall: { fontSize: '1.25rem' },
        sizeMedium: { fontSize: '1.25rem' },
        sizeLarge: { fontSize: '1.25rem' },
      },
    },
    MuiCard: { styleOverrides: { root: { borderRadius: radius.md } } },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: radius.md } } },
    MuiChip: { styleOverrides: { root: { borderRadius: radius.pill } } },
    MuiTextField: { defaultProps: { variant: 'outlined', fullWidth: true } },
    MuiLink: { defaultProps: { underline: 'hover' } },
    MuiContainer: { defaultProps: { maxWidth: 'lg' } },
  },
};

export const lightTheme = createTheme({ ...shared, palette: palette.light });
export const darkTheme = createTheme({ ...shared, palette: palette.dark });

export type AppTheme = typeof lightTheme;
