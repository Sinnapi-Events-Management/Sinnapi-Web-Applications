'use client';
import { Box, Button } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';

export type NewArrivalsPillProps = {
  count: number;
  onApply: () => void;
};

/**
 * "N new notifications" — the control that folds buffered realtime arrivals
 * into the feed.
 *
 * It exists so the list never rearranges itself under someone who is reading
 * it: arrivals wait here until the reader asks for them. It sticks to the top
 * of the scrolling column, because that is where the rows it is promising will
 * appear and where the eye returns after a scroll.
 *
 * The wrapper is a polite live region and stays mounted at zero height when
 * empty. A region that is added to the DOM at the same moment it gains content
 * is announced unreliably by screen readers; one that is already there and
 * merely changes is announced every time.
 */
export function NewArrivalsPill({ count, onApply }: NewArrivalsPillProps) {
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 2,
        display: 'flex',
        justifyContent: 'center',
        // Collapsed rather than unmounted, so the region is stable for AT and
        // the feed below does not shift by the pill's height on every arrival.
        height: count > 0 ? 'auto' : 0,
        overflow: 'hidden',
        pb: count > 0 ? 1 : 0,
      }}
    >
      {count > 0 && (
        <Button
          onClick={onApply}
          variant="contained"
          size="small"
          startIcon={<ArrowUpwardIcon />}
          sx={{ borderRadius: 999, boxShadow: 3, textTransform: 'none', fontWeight: 600 }}
        >
          {count} new {count === 1 ? 'notification' : 'notifications'}
        </Button>
      )}
    </Box>
  );
}
