'use client';
import { experimental_extendTheme as extendTheme, type ThemeOptions } from '@mui/material/styles';
import { palette, fonts } from './tokens';
import { modalOverrides } from './theme';

/**
 * The **portal** design language — shared by admin, client and vendor.
 *
 * Distinct from the `lightTheme`/`darkTheme` in `./theme`, which dress the
 * marketing site: the portals run denser typography and controls, and a
 * secondary-forward (gold) action colour. This module is the single source of
 * truth for all three; previously each app carried its own near-identical copy
 * and they had already begun to drift.
 *
 * ## The 60-30-10 balance
 *
 * Gold (`secondary`) is the portal's default action colour — every button reads
 * gold unless it opts into a semantic colour (error/success) or is explicitly
 * set otherwise. Teal (`primary`) is *reserved for wayfinding*: nav active
 * states, the logo wordmark, links and verification marks. Spending teal on
 * ordinary actions is what previously made the client and vendor portals read
 * as a different product from admin.
 */

/** Palette-independent options: typography scale and component defaults. */
export const portalThemeBase: ThemeOptions = {
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
    // Shared across all four apps: the 4px-blurred modal scrim.
    ...modalOverrides,
    // Gold (`secondary`) as the default action colour — see the balance note
    // above. Applies to contained, outlined and text alike;
    // `secondary.contrastText` keeps solid buttons AA-legible, and
    // outlined/text use `secondary.main`/`.dark`, which clear contrast on the
    // pale-gold light canvas and the warm dark canvas alike.
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

/**
 * Light scheme warmed toward the secondary (gold) family: the page canvas is the
 * palest gold tint (`secondary.lightest`) while cards/paper stay white, so every
 * surface sits on a soft golden field and white content lifts off it. This is
 * the ambient 60% of the 60-30-10 balance.
 */
export const portalLightPalette = {
  ...palette.light,
  background: {
    ...palette.light.background,
    default: palette.light.secondary.lightest,
  },
};

/**
 * Dark scheme. The warm tilt lives in the tokens themselves (see `palette.dark`
 * in ./tokens), so unlike the light scheme there is nothing to override here —
 * the canvas already carries the same gold family as its light counterpart.
 */
export const portalDarkPalette = palette.dark;

/**
 * Builds the portal theme: a single CSS-variables theme carrying both schemes.
 * The active scheme is chosen at runtime by `ColorModeProvider`/`useColorScheme`
 * (via the AppBar's `ThemeToggle`) and applied through CSS variables, so
 * toggling re-colours the portal instantly and the choice persists across
 * reloads with no flash.
 */
export function createPortalTheme() {
  return extendTheme({
    ...portalThemeBase,
    colorSchemes: {
      light: { palette: portalLightPalette },
      dark: { palette: portalDarkPalette },
    },
  });
}
