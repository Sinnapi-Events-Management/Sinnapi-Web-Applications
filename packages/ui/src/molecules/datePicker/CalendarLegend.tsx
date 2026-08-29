'use client';
/**
 * What the markers on the dates mean.
 *
 * A marked calendar without a key is a puzzle; this is the key. Generic on
 * purpose — the caller names its own markers, the design system only draws them.
 */
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { hatchGradient, markerTint } from './calendar.styles';

export type CalendarLegendItem = {
  /** Any theme colour path (`error.main`) or literal colour. */
  color: string;
  label: string;
  /**
   * How the swatch is drawn. `dot` (default) matches a `dot` calendar; `hatched`
   * matches a `hatched` one — a filled, struck-through square rather than a
   * bullet, so the key looks like the days it is explaining.
   */
  variant?: 'dot' | 'hatched';
};

/** Resolves `secondary.main` against the palette; passes literal colours through. */
function useSwatchColor(color: string): string {
  const theme = useTheme();
  const [family, shade] = color.split('.');
  const group = (theme.palette as unknown as Record<string, Record<string, string>>)[family];
  return (shade && group?.[shade]) || color;
}

function Swatch({ color, variant }: { color: string; variant: CalendarLegendItem['variant'] }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const resolved = useSwatchColor(color);

  if (variant !== 'hatched') {
    return (
      <Box
        sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }}
        aria-hidden
      />
    );
  }

  return (
    <Box
      aria-hidden
      sx={{
        width: 16,
        height: 16,
        flexShrink: 0,
        borderRadius: 0.75,
        backgroundColor: markerTint(resolved, dark),
        backgroundImage: hatchGradient(resolved, dark),
      }}
    />
  );
}

export function CalendarLegend({ items }: { items: CalendarLegendItem[] }) {
  if (items.length === 0) return null;

  return (
    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ px: 1.5, py: 1 }}>
      {items.map((item) => (
        <Stack key={item.label} direction="row" spacing={0.75} alignItems="center">
          <Swatch color={item.color} variant={item.variant} />
          <Typography variant="caption" color="text.secondary">
            {item.label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
