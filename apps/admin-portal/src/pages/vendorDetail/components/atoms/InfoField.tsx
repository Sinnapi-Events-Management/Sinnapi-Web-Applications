import type { ReactNode } from 'react';
import { Stack, Typography } from '@sinnapi/ui';

type Props = { label: string; children: ReactNode };

/**
 * One labelled fact in a detail card.
 *
 * An em dash for an absent value rather than an empty line, because a blank
 * where a phone number should be reads as a rendering fault; a dash reads as
 * "the vendor did not give us one", which is the true and actionable version.
 */
export default function InfoField({ label, children }: Props) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" component="div">
        {children ?? '—'}
      </Typography>
    </Stack>
  );
}
