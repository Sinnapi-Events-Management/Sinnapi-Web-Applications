'use client';
import type { ReactNode } from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export type MediaViewerHeaderProps = {
  title: string;
  /** "3 of 12" — omitted on a single-item gallery. */
  counter?: string;
  /** Owner actions for the item on screen (delete, set as cover, …). */
  actions?: ReactNode;
  onClose: () => void;
};

/**
 * The viewer's title bar: what you're looking at, where you are in the set, what
 * you can do to it, and the way out.
 *
 * Colours are fixed to white on the viewer's dark surface rather than themed —
 * this bar sits on the same near-black panel in light and dark mode alike, so a
 * `text.primary` here would be invisible half the time.
 */
export function MediaViewerHeader({ title, counter, actions, onClose }: MediaViewerHeaderProps) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ px: { xs: 1.5, sm: 2 }, py: 1.5, color: 'common.white' }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="subtitle1" fontWeight={700} noWrap>
          {title}
        </Typography>
        {counter && (
          <Typography variant="caption" sx={{ color: 'grey.400' }}>
            {counter}
          </Typography>
        )}
      </Box>

      {actions}

      <IconButton onClick={onClose} aria-label="Close viewer" sx={{ color: 'common.white' }}>
        <CloseIcon />
      </IconButton>
    </Stack>
  );
}
