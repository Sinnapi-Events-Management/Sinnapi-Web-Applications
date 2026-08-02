import { extendTheme, palette, fonts, type ThemeOptions } from '@sinnapi/ui/theme';

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
    // Gold (`secondary`) is the portal's default action color — every button
    // reads gold unless it opts into a semantic color (error/success) or is
    // explicitly set otherwise. Applies to contained, outlined and text alike;
    // `secondary.contrastText` (white) keeps solid buttons AA-legible and
    // outlined/text use `secondary.main`/`.dark` which clear contrast on the
    // white/cream surfaces. Teal (`primary`) is reserved for wayfinding accents.
    MuiButton: {
      defaultProps: { disableElevation: true, color: 'secondary' },
      styleOverrides: {
        root: { borderRadius: 8, minHeight: 42 },
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

// Warm the light scheme toward the secondary (gold) family: the page canvas is
// the palest gold tint (`secondary.lightest`) while cards/paper stay white, so
// every surface sits on a soft golden field and white content lifts off it. This
// is the ambient 60% of the 60-30-10 balance — deep teal (primary) stays for
// primary actions and active states, saturated gold for accents. Dark mode is
// left on its neutral canvas for now.
const lightPalette = {
  ...palette.light,
  background: {
    ...palette.light.background,
    default: palette.light.secondary.lightest,
  },
};

// Single CSS-variables theme carrying both schemes. The active scheme is chosen
// at runtime by ColorModeProvider/useColorScheme (via the AppBar's ThemeToggle)
// and applied through CSS variables, so toggling re-colors the portal instantly
// and the choice persists across reloads with no flash.
export const theme = extendTheme({
  ...shared,
  colorSchemes: {
    light: { palette: lightPalette },
    dark: { palette: palette.dark },
  },
});
