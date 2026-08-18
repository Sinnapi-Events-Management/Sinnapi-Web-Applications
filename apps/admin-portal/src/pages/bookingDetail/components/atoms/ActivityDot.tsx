import { Box, Stack, type AccentColor } from '@sinnapi/ui';
import { alpha } from '@mui/material/styles';
import type { BookingActivityModel } from '@/lib/types';

/**
 * Palette per source. The trail interleaves four tables, and an operator
 * scanning it is usually looking for one of them — "when did the money move",
 * "who forced this" — so the source has to be legible before the text is read.
 */
const TONES: Record<BookingActivityModel['kind'], AccentColor> = {
  status: 'secondary',
  note: 'info',
  escrow: 'success',
  payment: 'info',
  admin: 'warning',
};

type Props = {
  kind: BookingActivityModel['kind'];
  /** The connector below the dot is omitted on the final entry. */
  isLast: boolean;
};

/** The dot-and-rail marker down the left of one activity entry. */
export default function ActivityDot({ kind, isLast }: Props) {
  const tone = TONES[kind];

  return (
    <Stack alignItems="center" sx={{ alignSelf: 'stretch', width: 20, flexShrink: 0 }}>
      <Box
        sx={{
          width: 10,
          height: 10,
          mt: '5px',
          borderRadius: '50%',
          bgcolor: `${tone}.main`,
          boxShadow: (t) => `0 0 0 3px ${alpha(t.palette[tone].main, 0.16)}`,
        }}
      />
      {!isLast && (
        <Box sx={{ flex: 1, width: '1px', my: 0.75, bgcolor: 'divider', minHeight: 12 }} />
      )}
    </Stack>
  );
}
