'use client';
import type { ReactNode } from 'react';
import {
  Experimental_CssVarsProvider as CssVarsProvider,
  experimental_extendTheme,
  // Deliberate: getInitColorSchemeScript is the no-flash script paired with the
  // v5 Experimental_CssVarsProvider — its storage keys/attribute match the
  // provider's. The newer <InitColorSchemeScript /> pairs with the v6 provider
  // and would desync the keys here.
  getInitColorSchemeScript,
} from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

/** A theme produced by `extendTheme({ colorSchemes: { light, dark } })`. */
type ColorSchemeTheme = ReturnType<typeof experimental_extendTheme>;

/**
 * Light is the default scheme everywhere; a visitor only lands in dark mode
 * after they explicitly toggle it (their choice persists in localStorage).
 * Keep this in sync between the provider and the no-flash script below — they
 * must agree on the default or the first paint and React disagree.
 */
const DEFAULT_MODE = 'light' as const;

/**
 * Wraps an app in MUI's CSS-variables theme provider so a stored dark-mode
 * choice is applied before paint (see {@link ColorSchemeScript}) instead of
 * flashing light first. Pass a theme built with `extendTheme({ colorSchemes })`.
 * Consumers read/flip the mode via `useColorScheme()` (re-exported from
 * `@sinnapi/ui/theme`) — typically through the `ThemeToggle` molecule.
 */
export function ColorModeProvider({
  theme,
  children,
}: {
  theme: ColorSchemeTheme;
  children: ReactNode;
}) {
  return (
    <CssVarsProvider theme={theme} defaultMode={DEFAULT_MODE} disableTransitionOnChange>
      <CssBaseline enableColorScheme />
      {children}
    </CssVarsProvider>
  );
}

/**
 * Inline script that resolves the persisted color scheme before React hydrates,
 * eliminating the flash of the wrong theme. Render it as the first child of
 * `<body>` in the root layout.
 */
export function ColorSchemeScript() {
  return <>{getInitColorSchemeScript({ defaultMode: DEFAULT_MODE })}</>;
}
