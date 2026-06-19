export { lightTheme, darkTheme, type AppTheme } from './theme';
export { palette, radius, fonts } from './tokens';

// Theme factory + types re-exported so app-level theme files (and any custom
// createTheme calls) can import from @sinnapi/ui/theme instead of @mui/material/styles.
export {
  createTheme,
  responsiveFontSizes,
  type Theme,
  type ThemeOptions,
} from '@mui/material/styles';
