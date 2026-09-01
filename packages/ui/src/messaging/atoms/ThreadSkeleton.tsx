'use client';
import { Box, Skeleton, Stack } from '@mui/material';

export type ThreadSkeletonProps = {
  /** Matches the loaded thread's column so nothing shifts when messages land. */
  rows?: { mine: boolean; w: string }[];
};

/**
 * Loading placeholder for a message thread.
 *
 * Alternating widths and sides so it reads as a conversation rather than a
 * list — a stack of identical bars tells the reader "a table is loading", which
 * is the wrong expectation to set a beat before bubbles appear.
 */
const DEFAULT_ROWS = [
  { mine: false, w: '58%' },
  { mine: true, w: '44%' },
  { mine: false, w: '66%' },
  { mine: true, w: '34%' },
  { mine: false, w: '50%' },
];

export function ThreadSkeleton({ rows = DEFAULT_ROWS }: ThreadSkeletonProps) {
  return (
    <Stack spacing={1.5} sx={{ py: 1, width: '100%' }}>
      {rows.map((r, i) => (
        <Box key={i} sx={{ display: 'flex', justifyContent: r.mine ? 'flex-end' : 'flex-start' }}>
          <Skeleton variant="rounded" width={r.w} height={44} sx={{ borderRadius: 2.5 }} />
        </Box>
      ))}
    </Stack>
  );
}
