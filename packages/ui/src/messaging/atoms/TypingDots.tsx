'use client';
import { Box, keyframes } from '@mui/material';

const bounce = keyframes`
  0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
  30%           { transform: translateY(-4px); opacity: 1; }
`;

export type TypingDotsProps = {
  /** Scales the whole indicator; the dots and their gap both follow it. */
  size?: number;
};

/**
 * The three-dot "still writing" indicator.
 *
 * Carries no text of its own so the caller decides the wording — "Amara is
 * typing" in a one-to-one thread reads very differently from "2 people are
 * typing" — and the dots stay identical in both.
 *
 * The animation is suppressed under `prefers-reduced-motion`: a perpetual
 * bouncing loop sitting at the bottom of the viewport is exactly the kind of
 * motion that setting exists to stop. The dots stay visible at rest, so the
 * signal survives without the movement.
 */
export function TypingDots({ size = 6 }: TypingDotsProps) {
  return (
    <Box aria-hidden sx={{ display: 'inline-flex', alignItems: 'center', gap: `${size * 0.6}px` }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: size,
            height: size,
            borderRadius: '50%',
            bgcolor: 'text.secondary',
            opacity: 0.35,
            animation: `${bounce} 1.2s infinite ease-in-out`,
            animationDelay: `${i * 0.16}s`,
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
              opacity: 0.55,
            },
          }}
        />
      ))}
    </Box>
  );
}
