'use client';
import { Box, Chip } from '@mui/material';

export type DayDividerProps = {
  /** Pre-formatted by `formatDayLabel` — "Today", "Yesterday", "3 Mar". */
  label: string;
  /**
   * Pins the divider to the top of the scroll container as its day scrolls
   * past, so the reader always knows which day they are looking at deep inside
   * a long thread.
   */
  sticky?: boolean;
};

/**
 * Date separator between day-groups in a thread.
 *
 * Rendered as a `<li role="separator">` because the thread it sits in is a
 * list: a bare div would leave a screen reader announcing an item count that
 * disagrees with the number of messages.
 */
export function DayDivider({ label, sticky = true }: DayDividerProps) {
  return (
    <Box
      component="li"
      role="separator"
      aria-label={label}
      sx={{
        display: 'flex',
        justifyContent: 'center',
        listStyle: 'none',
        ...(sticky && {
          position: 'sticky',
          top: 0,
          // Above the bubbles it slides over, below the composer and header.
          zIndex: 1,
          py: 0.5,
        }),
      }}
    >
      <Chip
        label={label}
        size="small"
        sx={{
          height: 22,
          fontSize: 11,
          fontWeight: 600,
          // Opaque rather than translucent: bubbles pass directly underneath a
          // sticky divider, and a see-through pill turns the label into noise
          // at exactly the moment it is needed.
          bgcolor: 'background.paper',
          color: 'text.secondary',
          border: 1,
          borderColor: 'divider',
        }}
      />
    </Box>
  );
}
