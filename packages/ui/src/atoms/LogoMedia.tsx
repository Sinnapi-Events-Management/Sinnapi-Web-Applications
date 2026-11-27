'use client';
import { Box, type SxProps, type Theme } from '@mui/material';

export type LogoMediaProps = {
  src: string;
  alt: string;
  /** Height of the media area in px (responsive object allowed). */
  height: number | Record<string, number>;
  className?: string;
  sx?: SxProps<Theme>;
};

/** The plate behind a logo: warm paper, the same in light and dark mode. */
export const LOGO_PLATE = '#F7F5F2';

/**
 * A vendor's business logo as a card's media: the whole image, centred and
 * contained on a light plate — never cropped like a cover photo, never
 * stretched. The plate stays light in dark mode on purpose: most logos are
 * dark ink, and a transparent one would disappear on a dark card.
 */
export function LogoMedia({ src, alt, height, className, sx }: LogoMediaProps) {
  return (
    <Box
      sx={[
        {
          height,
          width: '100%',
          bgcolor: LOGO_PLATE,
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
          p: 3,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box
        component="img"
        src={src}
        alt={alt}
        loading="lazy"
        className={className}
        sx={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          display: 'block',
          transition: 'transform .4s ease',
        }}
      />
    </Box>
  );
}
