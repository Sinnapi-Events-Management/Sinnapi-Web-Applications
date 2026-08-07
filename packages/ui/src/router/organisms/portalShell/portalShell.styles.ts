import type { Theme } from '@mui/material/styles';

/**
 * Animates the chrome offsets that move when the sidebar collapses. Shared by
 * the top bar, the nav column and the content area so they travel as one piece.
 */
export const chromeTransition = (t: Theme) =>
  t.transitions.create(['width', 'margin', 'padding'], {
    easing: t.transitions.easing.sharp,
    duration: t.transitions.duration.enteringScreen,
  });

/**
 * Translucent `paper` for the top bar, so it lifts off the warm content canvas
 * and reads as one crisp layer with the sidebar and cards.
 *
 * `CssVarsProvider` exposes `vars` at runtime (channel tokens make the alpha
 * possible) but the base `Theme` type doesn't declare it, hence the cast and
 * the opaque fallback.
 */
export const topBarBackground = (t: Theme) => {
  const vars = (t as { vars?: { palette: { background: { paperChannel: string } } } }).vars;
  return vars ? `rgba(${vars.palette.background.paperChannel} / 0.8)` : t.palette.background.paper;
};
