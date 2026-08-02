import { createTheme, palette, fonts, type ThemeOptions } from '@sinnapi/ui/theme';

// Portal design language — denser typography & controls than the marketing site.
// Colors come from the shared design tokens (single source of truth in @sinnapi/ui/tokens).
const shared: ThemeOptions = {
  shape: { borderRadius: 8 },
  breakpoints: { values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 } },
  typography: {
    fontFamily: fonts.body,
    h1: { fontFamily: fonts.heading, fontWeight: 600, fontSize: '2.75rem', lineHeight: 1.15 },
    h2: { fontFamily: fonts.heading, fontWeight: 700, fontSize: '2.25rem', lineHeight: 1.2 },
    h3: { fontFamily: fonts.heading, fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.25 },
    h4: { fontFamily: fonts.heading, fontWeight: 600, fontSize: '1.375rem' },
    h5: { fontFamily: fonts.heading, fontWeight: 600, fontSize: '1.25rem' },
    h6: { fontFamily: fonts.heading, fontWeight: 600, fontSize: '1.125rem' },
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
    overline: { fontSize: '1rem', fontWeight: 600, letterSpacing: '1px' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, minHeight: 42, fontWeight: 800 },
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
    MuiChip: { styleOverrides: { root: { borderRadius: 999 } } },
    MuiTextField: { defaultProps: { variant: 'outlined', fullWidth: true, size: 'small' } },
    MuiListItemButton: { styleOverrides: { root: { borderRadius: 8 } } },
  },
};

export const lightTheme = createTheme({ ...shared, palette: palette.light });
