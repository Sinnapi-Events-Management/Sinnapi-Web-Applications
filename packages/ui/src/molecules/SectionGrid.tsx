'use client';
import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

export type SectionGridProps = {
  /**
   * The column track list per breakpoint. Defaults to one column on a phone and
   * two equal ones from `md` up. Use `fr` ratios for asymmetric pairs, e.g.
   * `{ xs: '1fr', md: '7fr 5fr' }`.
   */
  template?: Record<string, string> | string;
  children: ReactNode;
  sx?: SxProps<Theme>;
};

/**
 * The column layout for a detail page's cards.
 *
 * A CSS grid rather than `<Grid item>` wrappers, and deliberately: half the
 * cards on a booking page render `null` when they have nothing to say — no
 * quotation, no settlement request, a direct payment with no schedule. A
 * `<Grid item>` around one of those is still an element, so it still takes a
 * cell and still contributes its gap, leaving a hole where the card that
 * decided not to draw would have been. A `null` child of a CSS grid produces no
 * DOM at all, so the remaining cards simply close up.
 *
 * `alignItems: start` keeps a short card short instead of stretching it to its
 * neighbour's height, and `minmax(0, …)` tracks stop a wide table inside one
 * card from pushing the grid past the viewport.
 */
export function SectionGrid({
  template = { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
  children,
  sx,
}: SectionGridProps) {
  return (
    <Box
      sx={[
        {
          display: 'grid',
          gridTemplateColumns: template,
          alignItems: 'start',
          gap: 3,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}
