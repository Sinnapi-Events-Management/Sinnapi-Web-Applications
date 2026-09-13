'use client';
import type { ReactNode } from 'react';
import { Card, CardContent, Stack } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { AccentColor } from '../../molecules/IconBadge';

export type OutcomeCardProps = {
  /** Tint of the wash behind the header. Matches the mark's accent. */
  accent?: AccentColor;
  children: ReactNode;
  sx?: object;
};

/**
 * The surface every payment outcome is told on — confirmed, pending, failed
 * and cancelled alike.
 *
 * Before this, only the confirmed state had a bespoke `Paper` and the other
 * three used `SectionCard`; four outcomes of one flow spoke in two visual
 * languages, and the state a payer is most likely to screenshot was the one
 * that matched nothing else.
 *
 * The accent arrives as a soft top-down wash composed with `alpha()` rather
 * than a flat bar, so it composites against whichever canvas it lands on and
 * stays a wash in both schemes instead of a saturated band on the dark one.
 */
export function OutcomeCard({ accent = 'success', children, sx }: OutcomeCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 4,
        backgroundImage: (t) =>
          `linear-gradient(to bottom, ${alpha(t.palette[accent].main, 0.07)}, ${alpha(
            t.palette[accent].main,
            0,
          )} 220px)`,
        ...sx,
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, sm: 4 }, '&:last-child': { pb: { xs: 3, sm: 4 } } }}>
        <Stack spacing={{ xs: 3, sm: 3.5 }}>{children}</Stack>
      </CardContent>
    </Card>
  );
}
