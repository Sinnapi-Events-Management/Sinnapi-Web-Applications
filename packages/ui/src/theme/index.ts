export { lightTheme, darkTheme, modalOverrides, type AppTheme } from './theme';
export { palette, radius, fonts, brand, common, gradientStops } from './tokens';

// The portal design language (admin / client / vendor) — denser and
// secondary-forward, as opposed to the marketing themes above.
export {
  createPortalTheme,
  portalThemeBase,
  portalLightPalette,
  portalDarkPalette,
} from './portal';

// Color-mode (dark/light) infrastructure built on MUI's CSS-variables provider.
export { ColorModeProvider, ColorSchemeScript } from './ColorMode';

// Theme factory + types re-exported so app-level theme files (and any custom
// createTheme calls) can import from @sinnapi/ui/theme instead of @mui/material/styles.
// `extendTheme`/`useColorScheme` power the CSS-variables color-mode flow above.
export {
  createTheme,
  experimental_extendTheme as extendTheme,
  useColorScheme,
  responsiveFontSizes,
  type Theme,
  type ThemeOptions,
} from '@mui/material/styles';
