import type { ElementType } from 'react';
import { Box, Stack, Typography } from '@sinnapi/ui';
import { common, palette, withAlpha } from '@sinnapi/ui/tokens';

export type HeroFloatingCardProps = {
  Icon: ElementType;
  value: string;
  label: string;
  /** Absolute placement over the collage; falls back to static flow on mobile. */
  sx?: import('@sinnapi/ui').SxProps<import('@sinnapi/ui').Theme>;
};

/**
 * Glass proof chip that floats over the hero collage. Frosted white surface so
 * it reads over any photo, echoing the glass stat cards on the impact band.
 * Decorative-forward, so the icon is aria-hidden and the value carries meaning.
 */
export default function HeroFloatingCard({ Icon, value, label, sx }: HeroFloatingCardProps) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      sx={{
        px: 2,
        py: 1.5,
        borderRadius: 3,
        bgcolor: withAlpha(common.white, 0.82),
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: `1px solid ${withAlpha(common.white, 0.6)}`,
        boxShadow: `0 18px 40px ${withAlpha(common.black, 0.22)}`,
        ...sx,
      }}
    >
      <Box
        aria-hidden
        sx={{
          flexShrink: 0,
          width: 40,
          height: 40,
          borderRadius: 2,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'primary.contrastText',
          bgcolor: 'primary.main',
        }}
      >
        <Icon fontSize="small" />
      </Box>
      <Box>
        {/* Card surface is always frosted white, so pin ink to the light palette
            in both schemes — scheme-reactive tokens would go white-on-white in dark mode. */}
        <Typography sx={{ fontWeight: 700, lineHeight: 1.1, color: palette.light.text.primary }}>
          {value}
        </Typography>
        <Typography variant="caption" sx={{ color: palette.light.text.secondary, lineHeight: 1.2 }}>
          {label}
        </Typography>
      </Box>
    </Stack>
  );
}
