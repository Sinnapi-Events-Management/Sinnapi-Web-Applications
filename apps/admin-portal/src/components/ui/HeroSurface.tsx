import type { ReactNode } from 'react';
import { Box, type SxProps } from '@sinnapi/ui';
import type { Theme } from '@sinnapi/ui/theme';
import { heroRootSx, heroGlowSx } from './heroSurface.styles';

/**
 * Shared banner surface for the detail-page heroes (Application / Plan / Event /
 * Vendor). It owns the one thing those heroes must never drift on: the calm,
 * near-neutral elevated surface (white sheet in light mode, raised neutral panel
 * in dark) and the foreground treatment that sits on it. Colour tokens and
 * rationale live in `./heroSurface.styles`.
 *
 * Renders the gradient banner + decorative corner glow, then the hero content.
 * `sx` is merged onto the root so callers can nudge layout without touching the
 * surface colours.
 */
export default function HeroSurface({
  children,
  sx,
}: {
  children: ReactNode;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box sx={[heroRootSx, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}>
      <Box aria-hidden sx={heroGlowSx} />
      {children}
    </Box>
  );
}
