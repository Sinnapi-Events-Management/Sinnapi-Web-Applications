'use client';
import { Box, Typography, alpha } from '@mui/material';

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
 * A quiet uppercase micro-label rather than the outlined chip it used to be.
 * A bordered pill floating in the middle of a thread reads as a control — the
 * eye goes to it expecting something to happen — when all it is doing is
 * labelling the messages beneath it. Stripping the border and dropping the
 * label to caption weight puts it back where it belongs in the hierarchy:
 * below the messages, above nothing.
 *
 * The background is near-opaque with a blur behind it rather than fully
 * transparent, because bubbles pass directly underneath a sticky divider and a
 * see-through label turns into noise at exactly the moment it is needed.
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
        py: 1,
        ...(sticky && {
          position: 'sticky',
          top: 0,
          // Above the bubbles it slides over, below the composer and header.
          zIndex: 1,
        }),
      }}
    >
      <Box
        sx={{
          px: 1.25,
          py: 0.375,
          borderRadius: 99,
          bgcolor: (t) => alpha(t.palette.background.paper, 0.9),
          backdropFilter: 'blur(8px)',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            lineHeight: 1.4,
            color: 'text.secondary',
          }}
        >
          {label}
        </Typography>
      </Box>
    </Box>
  );
}
