'use client';
/**
 * What the dots under the dates mean.
 *
 * A marked calendar without a key is a puzzle; this is the key. Generic on
 * purpose — the caller names its own markers, the design system only draws them.
 */
import { Box, Stack, Typography } from '@mui/material';

export type CalendarLegendItem = {
  /** Any theme colour path (`error.main`) or literal colour. */
  color: string;
  label: string;
};

export function CalendarLegend({ items }: { items: CalendarLegendItem[] }) {
  if (items.length === 0) return null;

  return (
    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ px: 1.5, py: 1 }}>
      {items.map((item) => (
        <Stack key={item.label} direction="row" spacing={0.75} alignItems="center">
          <Box
            sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color }}
            aria-hidden
          />
          <Typography variant="caption" color="text.secondary">
            {item.label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
