'use client';
import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { PAPER } from '../paper';

/** The small spaced capitals above each block on a printed document. */
export function PaperLabel({ children }: { children: ReactNode }) {
  return (
    <Box
      component="div"
      sx={{
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '1px',
        color: PAPER.muted,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Box>
  );
}
