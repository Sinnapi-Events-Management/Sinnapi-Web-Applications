'use client';
import type { ReactNode } from 'react';
import { Stack } from '@mui/material';

export type OutcomeActionsProps = {
  children: ReactNode;
};

/**
 * The row of things to do next.
 *
 * Full-width and stacked on a phone so the primary action is a thumb-sized
 * target, side by side and intrinsically sized from `sm` up. `sm` buttons
 * keep their own width via `width: auto`, which a bare `fullWidth` on each
 * child would otherwise override at every breakpoint.
 */
export function OutcomeActions({ children }: OutcomeActionsProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{
        '& > *': { width: { xs: '100%', sm: 'auto' } },
      }}
    >
      {children}
    </Stack>
  );
}
