'use client';
import type { ReactNode } from 'react';
import { Box, type SxProps } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { heroRootSx, heroGlowSx } from './heroSurface.styles';

export type HeroSurfaceProps = {
  children: ReactNode;
  sx?: SxProps<Theme>;
};

/**
 * Shared banner surface for detail-page heroes. It owns the one thing those
 * heroes must never drift on: the calm, near-neutral elevated surface (white
 * sheet in light mode, raised warm panel in dark) and the foreground treatment
 * that sits on it. Colour tokens and rationale live in `./heroSurface.styles`.
 *
 * Renders the gradient banner + decorative corner glow, then the hero content.
 * `sx` is merged onto the root so callers can nudge layout without touching the
 * surface colours.
 */
export function HeroSurface({ children, sx }: HeroSurfaceProps) {
  return (
    <Box sx={[heroRootSx, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}>
      <Box aria-hidden sx={heroGlowSx} />
      {children}
    </Box>
  );
}
