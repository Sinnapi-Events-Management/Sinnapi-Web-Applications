'use client';
import { IconButton } from '@sinnapi/ui/atoms';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

/**
 * Circular prev/next control flanking the rail. Overlaid on the track edges so
 * it costs no vertical space, and hidden below `md` where touch swipe is the
 * natural gesture and the buttons would sit on top of the cards.
 */
export default function RailNavButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'prev' | 'next';
  disabled: boolean;
  onClick: () => void;
}) {
  const isPrev = direction === 'prev';

  return (
    <IconButton
      aria-label={isPrev ? 'Previous featured vendors' : 'Next featured vendors'}
      disabled={disabled}
      onClick={onClick}
      sx={{
        display: { xs: 'none', md: 'inline-flex' },
        position: 'absolute',
        top: '40%',
        transform: 'translateY(-50%)',
        [isPrev ? 'left' : 'right']: -20,
        zIndex: 2,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        boxShadow: 2,
        transition: 'opacity .2s ease, box-shadow .2s ease',
        '&:hover': { bgcolor: 'background.paper', boxShadow: 4 },
        // Kept mounted rather than unmounted at the ends so the track never
        // reflows mid-scroll; it just fades out of the way.
        '&.Mui-disabled': { opacity: 0, pointerEvents: 'none' },
      }}
    >
      {isPrev ? <ChevronLeft /> : <ChevronRight />}
    </IconButton>
  );
}
