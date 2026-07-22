import { useTheme } from '@sinnapi/ui';
import type { SeriesColor } from '@/lib/analytics';

/**
 * Resolve report chart colours from the live MUI theme so every recharts surface
 * tracks light/dark mode and the brand palette instead of hard-coding hexes.
 * Kept as a hook (not constants) because the values only exist inside a theme
 * context and must recompute when the colour scheme flips.
 */
export function useChartTokens() {
  const theme = useTheme();
  const colorOf = (name: SeriesColor): string => theme.palette[name].main;

  return {
    colorOf,
    /** Palette order for auto-coloured breakdowns that don't carry their own. */
    order: ['primary', 'secondary', 'info', 'success', 'warning', 'error'] as SeriesColor[],
    axis: theme.palette.text.secondary,
    grid: theme.palette.divider,
    tooltip: {
      background: theme.palette.background.paper,
      border: theme.palette.divider,
      text: theme.palette.text.primary,
      radius: 10,
    },
  };
}
