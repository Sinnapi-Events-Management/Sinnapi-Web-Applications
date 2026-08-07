'use client';
import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';

/** Palette families a badge may tint itself with. */
export type AccentColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

export type IconBadgeProps = {
  /** Tint for the icon and its translucent background. Defaults to the portals' gold. */
  accent?: AccentColor;
  /** Badge edge length in px. */
  size?: number;
  /** Rendered glyph size in px. Defaults to ~55% of the badge. */
  iconSize?: number;
  /** Circular instead of the default rounded square. */
  circular?: boolean;
  children: ReactNode;
  sx?: object;
};

/**
 * Tinted icon badge — a coloured glyph on a soft same-hue background. The visual
 * signature shared by `SectionCard` headers and confirmation dialogs, extracted
 * so the tint maths lives in one place and stays consistent everywhere.
 *
 * The 12% alpha is deliberately scheme-agnostic: `alpha()` composites against
 * whatever surface the badge lands on, so it reads as a soft wash on the pale
 * gold light canvas and on the warm dark canvas alike.
 */
export function IconBadge({
  accent = 'secondary',
  size = 40,
  iconSize,
  circular = false,
  children,
  sx,
}: IconBadgeProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: circular ? '50%' : 2,
        color: `${accent}.main`,
        bgcolor: (t) => alpha(t.palette[accent].main, 0.12),
        '& > svg': { fontSize: iconSize ?? Math.round(size * 0.55) },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
