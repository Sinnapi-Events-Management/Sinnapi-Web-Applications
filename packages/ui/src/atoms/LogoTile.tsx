'use client';
import { Box } from '@mui/material';
import { LOGO_PLATE } from './LogoMedia';

export type LogoTileProps = {
  src: string | null;
  /** Seeds the fallback initials when there is no image. */
  name: string;
  /** What the image is, for its alt text, e.g. `business logo`. */
  subject?: string;
  width: number;
  height: number;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

/**
 * A logo shown whole — never cropped, never stretched — on a white tile.
 *
 * White in dark mode too, on purpose: the logo's main home is a white
 * document, and a transparent dark wordmark would vanish on a dark surface.
 * What the vendor sees here is what their client will see on paper.
 */
export function LogoTile({ src, name, subject = 'logo', width, height }: LogoTileProps) {
  return (
    <Box
      sx={{
        width,
        maxWidth: '100%',
        height,
        borderRadius: 3,
        bgcolor: LOGO_PLATE,
        boxShadow: (t) => `0 0 0 1px ${t.palette.divider}`,
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        p: 1.5,
      }}
    >
      {src ? (
        <Box
          component="img"
          src={src}
          alt={`${name} — ${subject}`}
          sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
        />
      ) : (
        <Box
          aria-hidden
          sx={{ fontSize: Math.round(height * 0.3), fontWeight: 700, color: '#6B6276' }}
        >
          {initials(name)}
        </Box>
      )}
    </Box>
  );
}
