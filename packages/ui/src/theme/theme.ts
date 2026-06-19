'use client';
import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { palette, radius, fonts } from './tokens';

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
      fontSize: '2.8rem',
      lineHeight: 1.15,
      letterSpacing: '-0.25px',
    },
    h2: { fontWeight: 700, fontSize: '2.25rem', lineHeight: 1.2, letterSpacing: '-0.25px' },
    h3: { fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.25 },
    h4: { fontWeight: 600, fontSize: '1.375rem', lineHeight: 1.3 },
    h5: { fontWeight: 600, fontSize: '1.125rem', lineHeight: 1.35 },
    h6: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.4, letterSpacing: '0.15px' },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.3px' },
    overline: { fontWeight: 600, letterSpacing: '1px' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: radius.sm, minHeight: 44, paddingInline: 20 } },
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
