import type { SxProps, Theme } from '@sinnapi/ui';

/**
 * Subtle alternating section surface. Light grey in light mode; in dark mode it
 * switches to the elevated paper surface so sections actually go dark instead of
 * staying on MUI's fixed `grey.50`.
 *
 * Implemented as a plain `sx` object (not a `theme => …` callback) on purpose:
 * most section wrappers are server components, and a function `sx` can't cross
 * the RSC boundary into the client `Box`. The `data-mui-color-scheme` selector
 * is set on `<html>` by `ColorModeProvider`, so the CSS variables resolve at
 * paint time with no flash. Spread it into a section wrapper's `sx`.
 */
export const mutedSurface = {
  bgcolor: 'grey.50',
  '[data-mui-color-scheme="dark"] &': { bgcolor: 'background.paper' },
} satisfies SxProps<Theme>;
