'use client';
import { Box, Tooltip } from '@mui/material';

export type PresenceDotProps = {
  online: boolean;
  size?: number;
  /** Draws the ring that separates the dot from an avatar underneath it. */
  ring?: boolean;
};

/**
 * Online indicator for the counterparty in a thread.
 *
 * Renders when offline too, in the neutral ink rather than not at all. A dot
 * that vanishes is indistinguishable from a dot that has not loaded yet, which
 * makes "no dot" mean both "they are away" and "we do not know" — and presence
 * is only worth showing if its absence is trustworthy.
 *
 * Colour is never the only carrier: the tooltip states it, so the signal
 * survives for anyone who cannot separate the green from the grey.
 */
export function PresenceDot({ online, size = 10, ring = false }: PresenceDotProps) {
  const label = online ? 'Online' : 'Offline';

  return (
    <Tooltip title={label}>
      <Box
        role="img"
        aria-label={label}
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          bgcolor: online ? 'success.main' : 'text.disabled',
          ...(ring && {
            border: 2,
            borderColor: 'background.paper',
            boxSizing: 'content-box',
          }),
        }}
      />
    </Tooltip>
  );
}
