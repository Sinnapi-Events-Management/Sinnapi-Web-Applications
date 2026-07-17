import { extendTheme, palette, type ThemeOptions } from '@sinnapi/ui/theme';

// Portal design language — denser typography & controls than the marketing site.
// Colors come from the shared design tokens (single source of truth in @sinnapi/ui/tokens).
const shared: ThemeOptions = {
  shape: { borderRadius: 8 },
  breakpoints: { values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 } },
  typography: {
    fontFamily: '"Inter", Helvetica, Arial, sans-serif',
    h1: {
      fontFamily: '"Fraunces", Georgia, serif',
      fontWeight: 600,
      fontSize: '2.4rem',
      lineHeight: 1.15,
    },
    h2: { fontWeight: 700, fontSize: '2rem', lineHeight: 1.2 },
    h3: { fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.25 },
    h4: { fontWeight: 600, fontSize: '1.25rem' },
    h5: { fontWeight: 600, fontSize: '1.125rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.3px' },
    overline: { fontWeight: 600, letterSpacing: '1px' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 8, minHeight: 42 } },
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
