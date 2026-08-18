import { Box, SectionCard, Skeleton, Stack, Typography } from '@sinnapi/ui';
import HistoryIcon from '@mui/icons-material/History';
import type { BookingActivityModel } from '@/lib/types';
import ActivityRow from '../molecules/ActivityRow';

type Props = {
  entries: BookingActivityModel[];
  isLoading: boolean;
  error: unknown;
};

/**
 * Everything that has happened to this booking, in order — status changes,
 * escrow events, payment attempts and admin overrides, already interleaved by
 * `get_booking_activity`.
 *
 * A failed read is reported in place rather than through the page-level error
 * state: the booking, the money and the status control beside it are all still
 * usable without their history, and taking the whole page down over the trail
 * would remove the operator's ability to act on what they came to fix.
 */
export default function BookingActivityCard({ entries, isLoading, error }: Props) {
  return (
    <SectionCard
      title="Activity"
      icon={<HistoryIcon />}
      accent="info"
      subtitle="Status, money and overrides on one trail"
    >
      {isLoading ? (
        <Stack spacing={1.5}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={44} />
          ))}
        </Stack>
      ) : error ? (
        <Typography variant="body2" color="text.secondary">
          The activity trail could not be loaded.
        </Typography>
      ) : entries.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nothing has been recorded on this booking yet.
        </Typography>
      ) : (
        <Box>
          {entries.map((entry, i) => (
            <ActivityRow
              key={`${entry.kind}-${entry.occurred_at}-${i}`}
              entry={entry}
              isLast={i === entries.length - 1}
            />
          ))}
        </Box>
      )}
    </SectionCard>
  );
}
