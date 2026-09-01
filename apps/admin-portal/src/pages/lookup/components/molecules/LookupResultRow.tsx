import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

type Props = {
  label: string;
  children: ReactNode;
};

/**
 * One labelled line of a resolved record.
 *
 * A local molecule rather than the kit's `InfoRow`: that one is built for a
 * facts *card* — it owns its dividers, its icon slot and its copy affordance,
 * all of which this needs none of. Reusing it would mean passing four props to
 * switch off four features.
 *
 * The label sits above the value on a phone and beside it from `sm` up, with a
 * fixed label column so several rows align down the page rather than each
 * finding its own indent.
 */
export default function LookupResultRow({ label, children }: Props) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 0.25, sm: 2 },
        py: 1,
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ width: { sm: 140 }, flexShrink: 0 }}>
        {label}
      </Typography>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Box>
  );
}
