'use client';
import { IconButton, alpha } from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';

export type MediaNavButtonProps = {
  direction: 'previous' | 'next';
  onClick: () => void;
};

/**
 * Step control for the viewer. Floats over the media on a translucent disc so it
 * stays legible on a bright photo and on a dark video frame alike, and sits inset
 * from the edge rather than flush against it so it never overlaps a native video
 * control.
 *
 * Fixed to a dark disc with white glyphs in both themes on purpose: it sits on
 * the media, not on the page, so it has to survive whatever the photograph is —
 * a theme-coloured control would vanish against half of them.
 */
export function MediaNavButton({ direction, onClick }: MediaNavButtonProps) {
  const isPrevious = direction === 'previous';

  return (
    <IconButton
      onClick={onClick}
      aria-label={isPrevious ? 'Previous item' : 'Next item'}
      sx={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        [isPrevious ? 'left' : 'right']: { xs: 8, sm: 16 },
        color: 'common.white',
        bgcolor: (t) => alpha(t.palette.common.black, 0.5),
        backdropFilter: 'blur(4px)',
        border: (t) => `1px solid ${alpha(t.palette.common.white, 0.35)}`,
        '&:hover': { bgcolor: (t) => alpha(t.palette.common.black, 0.72) },
      }}
    >
      {isPrevious ? <ChevronLeftRoundedIcon /> : <ChevronRightRoundedIcon />}
    </IconButton>
  );
}
