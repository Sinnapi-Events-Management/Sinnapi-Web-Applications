'use client';
import type { ReactNode } from 'react';
import { Box } from '@mui/material';

export type OutcomeLayoutProps = {
  /** The verdict block. Spans the body column and sits above it. */
  header: ReactNode;
  /** What happens next, and the actions. */
  children: ReactNode;
  /** The receipt or payment summary. Omit for a state that has neither. */
  aside?: ReactNode;
};

/**
 * The two-column frame every payment outcome is laid out in.
 *
 * The portal shell hands a page up to 1440px, and the old return page answered
 * that by clamping itself to 760 and then clamping the card inside it to 640
 * with `mx: 'auto'` — which centres in 760, not in the viewport, so the money
 * sat in the left third of a wide screen with half the page empty beside it.
 * One frame owns the measure now: ~1120px with a rail, ~680 without, centred
 * for real.
 *
 * Named grid areas rather than two nested flex columns, because the reading
 * order changes with the breakpoint and the DOM order must not. On a phone the
 * payer wants verdict, then amount, then next steps; on a desktop the amount
 * belongs in a rail that stays put while the steps scroll. Areas express both
 * from a single source order, so nothing is duplicated or visually reordered
 * away from the order a screen reader announces.
 */
export function OutcomeLayout({ header, children, aside }: OutcomeLayoutProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        mx: 'auto',
        maxWidth: aside ? 1120 : 680,
        columnGap: { md: 4 },
        rowGap: { xs: 2.5, sm: 3 },
        alignItems: 'start',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          // The rail is given a range rather than a fixed width so it narrows
          // with the window instead of squeezing the body column to nothing
          // between `md` and a wide desktop.
          md: aside ? 'minmax(0, 1fr) clamp(300px, 32%, 380px)' : 'minmax(0, 1fr)',
        },
        gridTemplateAreas: {
          xs: aside ? '"header" "aside" "body"' : '"header" "body"',
          // The trailing `". aside"` row is load-bearing. The rail spans the
          // header and body rows, and when it is the taller of the two columns
          // grid hands its surplus height back to the rows it spans — which
          // showed up as an 80px hole between the verdict and the card under
          // it, growing with the length of the receipt. An empty `1fr` row
          // below absorbs that slack instead.
          md: aside ? '"header aside" "body aside" ". aside"' : '"header" "body"',
        },
        gridTemplateRows: { md: aside ? 'auto auto 1fr' : 'auto' },
      }}
    >
      <Box sx={{ gridArea: 'header', minWidth: 0 }}>{header}</Box>
      <Box sx={{ gridArea: 'body', minWidth: 0 }}>{children}</Box>
      {aside && (
        <Box
          sx={{
            gridArea: 'aside',
            minWidth: 0,
            // Clears the shell's fixed top bar. Only sticks where the rail is
            // actually a rail; on a phone it is just the next block down.
            position: { md: 'sticky' },
            top: { md: 88 },
          }}
        >
          {aside}
        </Box>
      )}
    </Box>
  );
}
