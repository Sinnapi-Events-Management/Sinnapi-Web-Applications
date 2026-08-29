import type { ReactNode } from 'react';
import { Stack, Typography } from '@sinnapi/ui';

/**
 * One labelled line in a day tooltip.
 *
 * Renders nothing at all when there is no value — a booking with no location
 * should show one line fewer, not a line reading "Location —".
 */
export default function TooltipFact({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode | null;
}) {
  if (!children) return null;

  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      {/* Inherits the tooltip's ink at a size that sits on the text baseline. */}
      <Stack sx={{ opacity: 0.7, '& > svg': { fontSize: 14, display: 'block' } }}>{icon}</Stack>
      <Typography variant="caption" sx={{ lineHeight: 1.5 }}>
        {children}
      </Typography>
    </Stack>
  );
}
