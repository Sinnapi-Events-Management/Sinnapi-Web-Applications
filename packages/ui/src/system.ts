'use client';
// MUI runtime utilities (not components) — re-exported so apps can drop
// @mui/material entirely and import everything from @sinnapi/ui.
export { ThemeProvider, CssBaseline, GlobalStyles, useMediaQuery } from '@mui/material';
export { useTheme, styled, alpha, type SxProps } from '@mui/material/styles';
// `Theme` (type) is exported from ./theme to keep a single source in the root barrel.
