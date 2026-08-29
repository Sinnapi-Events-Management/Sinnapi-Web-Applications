'use client';
import { Box, alpha } from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';

export type MediaPlayBadgeProps = {
  /** Smaller disc for a thumbnail-sized surface. */
  size?: 'small' | 'medium';
};

/**
 * The disc that marks a tile as playable, so a grid never implies a still image
 * where a clip is stored. Decorative — the tile's own aria-label carries "Play".
 */
export function MediaPlayBadge({ size = 'medium' }: MediaPlayBadgeProps) {
  const edge = size === 'small' ? 28 : 56;

  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        pointerEvents: 'none',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          width: edge,
          height: edge,
          borderRadius: '50%',
          color: 'common.white',
          bgcolor: (t) => alpha(t.palette.common.black, 0.55),
          backdropFilter: 'blur(4px)',
          border: (t) => `1px solid ${alpha(t.palette.common.white, 0.5)}`,
        }}
      >
        <PlayArrowRoundedIcon sx={{ fontSize: size === 'small' ? 18 : 32 }} />
      </Box>
    </Box>
  );
}
