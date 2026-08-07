'use client';
import { extendTheme, modalOverrides, palette, type ThemeOptions } from '@sinnapi/ui/theme';
import { fontStacks } from './fonts';

// Marketing-site design language. Colors come from the shared design tokens
// (single source of truth in @sinnapi/ui/tokens).
const shared: ThemeOptions = {
  shape: { borderRadius: 8 },
  breakpoints: { values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 } },
  typography: {
    fontFamily: fontStacks.body,
    h1: {
      fontFamily: fontStacks.display,
      fontWeight: 600,
      fontSize: '3.25rem',
      lineHeight: 1.15,
      letterSpacing: '-0.25px',
    },
    h2: {
      fontFamily: fontStacks.display,
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
      letterSpacing: '-0.25px',
    },
    h3: { fontFamily: fontStacks.display, fontWeight: 700, fontSize: '2rem', lineHeight: 1.25 },
    h4: { fontFamily: fontStacks.display, fontWeight: 600, fontSize: '1.5rem', lineHeight: 1.3 },
    h5: {
      fontFamily: fontStacks.display,
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.35,
    },
    h6: {
      fontFamily: fontStacks.display,
      fontWeight: 600,
      fontSize: '1.195rem',
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
    caption: { fontSize: '1rem', lineHeight: 1.4 },
    button: { fontSize: '1.25rem', fontWeight: 600, textTransform: 'none', letterSpacing: '0.3px' },
    overline: { fontSize: '0.95rem', fontWeight: 600, letterSpacing: '1px' },
  },
  components: {
    // Shared across all four apps: the 4px-blurred modal scrim.
    ...modalOverrides,
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, minHeight: 44, paddingInline: 20 },
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
    MuiCard: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 12 } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 999 } } },
    MuiTextField: { defaultProps: { variant: 'outlined', fullWidth: true } },
    MuiLink: { defaultProps: { underline: 'hover' } },
    MuiContainer: { defaultProps: { maxWidth: 'lg' } },
  },
};

// Single CSS-variables theme carrying both schemes. The active scheme is chosen
// at runtime by ColorModeProvider/useColorScheme and applied via CSS variables,
// so toggling re-colors every page instantly with no flash on reload.
export const theme = extendTheme({
  ...shared,
  colorSchemes: {
    light: { palette: palette.light },
    dark: { palette: palette.dark },
  },
});
