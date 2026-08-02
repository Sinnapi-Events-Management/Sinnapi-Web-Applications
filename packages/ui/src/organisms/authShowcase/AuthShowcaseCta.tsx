'use client';
import { Box, Stack } from '../../atoms/Layout';
import { Typography } from '../../atoms/Typography';
import { SecondaryButton } from '../../molecules/Button';
import { alpha } from '../../system';
import type { AuthShowcaseCta as Cta } from './types';

/**
 * Nested glass panel closing the showcase: one line of context plus the action.
 * Kept visually distinct from the card itself so it reads as the next step
 * rather than more marketing copy.
 */
export function AuthShowcaseCta({ cta }: { cta: Cta }) {
  const externalProps = cta.external
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {};

  return (
    <Stack
      spacing={1.5}
      sx={{
        p: 2.25,
        borderRadius: 3,
        bgcolor: (t) => alpha(t.palette.common.white, 0.1),
        border: (t) => `1px solid ${alpha(t.palette.common.white, 0.18)}`,
      }}
    >
      {cta.caption && (
        <Typography sx={{ fontSize: 14, lineHeight: 1.5, opacity: 0.88 }}>{cta.caption}</Typography>
      )}
      <Box>
        <SecondaryButton component="a" href={cta.href} {...externalProps} size="large">
          {cta.label}
        </SecondaryButton>
      </Box>
    </Stack>
  );
}
