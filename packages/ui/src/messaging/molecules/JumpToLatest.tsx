'use client';
import { Box, Chip, Fab } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

export type JumpToLatestProps = {
  /** How many messages arrived while the reader was scrolled up. */
  missed: number;
  onJump: () => void;
};

/**
 * The affordance back to the newest message, floating over the thread.
 *
 * Two forms for two different facts. With a count, it is news — a labelled chip
 * in the action colour, because "3 new messages" is worth interrupting a
 * scroll-back for. Without one, the reader has simply wandered up their own
 * history and only wants a way home, so it is a quiet neutral button.
 *
 * The caller renders this only when there is genuinely something below the
 * fold; a permanent jump button trains people to ignore it.
 */
export function JumpToLatest({ missed, onJump }: JumpToLatestProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 12,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      {missed > 0 ? (
        <Chip
          color="primary"
          clickable
          onClick={onJump}
          icon={<KeyboardArrowDownIcon />}
          label={`${missed} new ${missed === 1 ? 'message' : 'messages'}`}
          sx={{ boxShadow: 3, fontWeight: 600, pointerEvents: 'auto' }}
        />
      ) : (
        <Fab
          size="small"
          onClick={onJump}
          aria-label="Jump to latest message"
          sx={{
            bgcolor: 'background.paper',
            color: 'text.secondary',
            boxShadow: 3,
            pointerEvents: 'auto',
            '&:hover': { bgcolor: 'background.paper' },
          }}
        >
          <KeyboardArrowDownIcon />
        </Fab>
      )}
    </Box>
  );
}
