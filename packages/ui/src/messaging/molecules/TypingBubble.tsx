'use client';
import { Box, alpha } from '@mui/material';
import { TypingDots } from '../atoms/TypingDots';

export type TypingBubbleProps = {
  /** The counterparty's avatar, so the ghost bubble sits in the incoming column. */
  avatar?: React.ReactNode;
};

/**
 * The "they are writing" ghost bubble at the foot of a thread.
 *
 * Shaped exactly like an incoming bubble — same wash, same asymmetric corner,
 * same avatar gutter — because the whole signal is "a message is about to
 * appear here". A differently-shaped indicator makes the reader re-parse the
 * column when the real bubble replaces it.
 */
export function TypingBubble({ avatar }: TypingBubbleProps) {
  return (
    <Box
      component="li"
      sx={{ listStyle: 'none', display: 'flex', alignItems: 'flex-end', gap: 1, mt: 1.25 }}
    >
      {avatar}
      <Box
        sx={{
          px: 1.75,
          py: 1.25,
          borderRadius: 2.5,
          borderBottomLeftRadius: 0.5,
          bgcolor: (t) => alpha(t.palette.text.primary, 0.07),
        }}
      >
        <TypingDots />
      </Box>
    </Box>
  );
}
