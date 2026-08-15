'use client';
import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import type { AccentColor } from './IconBadge';

export type ActionNoteProps = {
  icon: ReactNode;
  children: ReactNode;
  /** Tints the glyph. The text stays secondary so the note never shouts. */
  tone?: AccentColor;
};

/**
 * A one-line explanation beside an action: why it is unavailable, or what it
 * will do.
 *
 * Shared rather than written per portal because an action that is offered and
 * an action that is withheld must be explained in the same voice and at the
 * same size — and because the client and vendor portals show the same withheld
 * actions, for the same server-side reasons, on the same booking.
 */
export function ActionNote({ icon, children, tone = 'secondary' }: ActionNoteProps) {
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Box sx={{ color: `${tone}.main`, display: 'flex', mt: '1px', '& > svg': { fontSize: 16 } }}>
        {icon}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 0 }}>
        {children}
      </Typography>
    </Stack>
  );
}
