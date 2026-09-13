'use client';
import { Box, useTheme } from '@mui/material';
import { PESAPAL_LOGO_ON_DARK, PESAPAL_LOGO_ON_LIGHT } from './providerLogos/pesapalLogoData';

export type PesapalLogoProps = {
  /** Rendered height in px; width follows the artwork. */
  height?: number;
};

/**
 * Pesapal's logo, in the version Pesapal issues for the current scheme.
 *
 * Unlike the payment marks this is not placed on a white tile: Pesapal ships
 * a reversed version (white on its own blue block) precisely for dark
 * grounds, so the dark scheme uses that artwork as issued. The portals run
 * MUI's CSS-variables provider, which swaps the active scheme into
 * `theme.palette`, so `palette.mode` is the scheme actually on screen.
 */
export function PesapalLogo({ height = 24 }: PesapalLogoProps) {
  const { palette } = useTheme();
  const isDark = palette.mode === 'dark';

  return (
    <Box
      component="img"
      src={isDark ? PESAPAL_LOGO_ON_DARK : PESAPAL_LOGO_ON_LIGHT}
      alt="Pesapal"
      sx={{ display: 'block', height, width: 'auto', borderRadius: isDark ? '3px' : 0 }}
    />
  );
}
