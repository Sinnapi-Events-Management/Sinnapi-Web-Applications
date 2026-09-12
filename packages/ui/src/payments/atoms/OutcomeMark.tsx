'use client';
import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import type { AccentColor } from '../../molecules/IconBadge';

const drawRing = keyframes`
  from { stroke-dashoffset: 302; }
  to   { stroke-dashoffset: 0; }
`;

const drawCheck = keyframes`
  from { stroke-dashoffset: 48; }
  to   { stroke-dashoffset: 0; }
`;

const settle = keyframes`
  0%   { transform: scale(0.92); }
  60%  { transform: scale(1.04); }
  100% { transform: scale(1); }
`;

const breathe = keyframes`
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50%      { opacity: 0.12; transform: scale(1.12); }
`;

export type OutcomeMarkProps = {
  /** Palette family the ring, glyph and wash are drawn from. */
  accent?: AccentColor;
  /** `check` draws the tick itself; `glyph` centres whatever `icon` provides. */
  variant?: 'check' | 'glyph';
  /** Required by `variant="glyph"`, ignored by `variant="check"`. */
  icon?: ReactNode;
  /** Outer diameter in px. */
  size?: number;
  /** Softly breathing halo — for a state that is still waiting on someone. */
  pulse?: boolean;
};

/**
 * The one status mark every payment outcome opens with.
 *
 * Every colour is resolved from `theme.palette[accent]` rather than written
 * as a hex, which is what makes the same component legible on the pale gold
 * light canvas and the warm dark one — a hardcoded `#4caf50` tick is the
 * classic dark-mode failure on this screen, glowing at full saturation
 * against a near-black surface.
 *
 * The stroke lengths are the real geometry of the paths below (a 48px-radius
 * circle is ~302 long), so the draw-on finishes exactly as the shape closes
 * instead of stalling on a guessed `dasharray: 1000`. Under
 * `prefers-reduced-motion` nothing animates and the mark is simply present.
 */
export function OutcomeMark({
  accent = 'success',
  variant = 'check',
  icon,
  size = 84,
  pulse = false,
}: OutcomeMarkProps) {
  return (
    <Box
      sx={{
        position: 'relative',
        width: size,
        height: size,
        flex: 'none',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      {pulse && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            bgcolor: (t) => alpha(t.palette[accent].main, 0.28),
            animation: `${breathe} 2.4s ease-in-out infinite`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0.18 },
          }}
        />
      )}

      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          bgcolor: (t) => alpha(t.palette[accent].main, 0.1),
        }}
      />

      {variant === 'check' ? (
        <Box
          component="svg"
          viewBox="0 0 112 112"
          aria-hidden
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            color: `${accent}.main`,
            animation: `${settle} 0.45s ease-out 0.5s both`,
            '& .ring': {
              strokeDasharray: 302,
              animation: `${drawRing} 0.6s ease-out both`,
            },
            '& .tick': {
              strokeDasharray: 48,
              animation: `${drawCheck} 0.3s ease-out 0.55s both`,
            },
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
              '& .ring, & .tick': { animation: 'none', strokeDasharray: 'none' },
            },
          }}
        >
          <circle
            className="ring"
            cx="56"
            cy="56"
            r="48"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            transform="rotate(-90 56 56)"
          />
          <polyline
            className="tick"
            points="37,57 50,70 76,44"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Box>
      ) : (
        <Box
          aria-hidden
          sx={{
            position: 'relative',
            display: 'grid',
            placeItems: 'center',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            border: (t) => `2px solid ${alpha(t.palette[accent].main, 0.35)}`,
            color: `${accent}.main`,
            animation: `${settle} 0.4s ease-out both`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            '& > svg': { fontSize: Math.round(size * 0.42) },
          }}
        >
          {icon}
        </Box>
      )}
    </Box>
  );
}
