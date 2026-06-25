'use client';
import { extendTheme, palette, type ThemeOptions } from '@sinnapi/ui/theme';
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
      styleOverrides: { root: { borderRadius: 8, minHeight: 44, paddingInline: 20 } },
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
