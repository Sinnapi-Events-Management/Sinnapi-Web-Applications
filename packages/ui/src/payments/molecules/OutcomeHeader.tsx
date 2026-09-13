'use client';
import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import type { AccentColor } from '../../molecules/IconBadge';
import { OutcomeMark } from '../atoms/OutcomeMark';

export type OutcomeHeaderProps = {
  title: string;
  /** The reference a payer quotes to support, or the plan they bought. */
  reference?: ReactNode;
  /** One sentence of reassurance under the title. */
  description?: ReactNode;
  accent?: AccentColor;
  markVariant?: 'check' | 'glyph';
  markIcon?: ReactNode;
  /** Breathing halo on the mark, for a state still waiting on the provider. */
  pulse?: boolean;
};

/**
 * Mark, verdict, reference — the block that answers "did it work" before the
 * payer has read anything else.
 *
 * Centred on a phone, where it is the whole first screen, and left-aligned
 * from `sm` up, where it heads a column beside the receipt rail: a centred
 * heading over left-aligned body copy reads as two unrelated blocks.
 */
export function OutcomeHeader({
  title,
  reference,
  description,
  accent = 'success',
  markVariant = 'check',
  markIcon,
  pulse,
}: OutcomeHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 2, sm: 2.5 }}
      alignItems={{ xs: 'center', sm: 'flex-start' }}
      sx={{ textAlign: { xs: 'center', sm: 'left' } }}
    >
      <OutcomeMark accent={accent} variant={markVariant} icon={markIcon} pulse={pulse} size={72} />
      <Box sx={{ minWidth: 0, pt: { sm: 0.5 } }}>
        <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
          {title}
        </Typography>
        {reference && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {reference}
          </Typography>
        )}
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {description}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
