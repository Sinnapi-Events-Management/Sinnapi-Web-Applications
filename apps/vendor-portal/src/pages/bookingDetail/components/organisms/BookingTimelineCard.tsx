import { Box, Skeleton, Stack, Typography, SectionCard } from '@sinnapi/ui';
import TimelineIcon from '@mui/icons-material/Timeline';
import TimelineStepRow from '../molecules/TimelineStepRow';
import { useBookingTimeline } from '../../hooks/useBookingTimeline';

type Props = {
  bookingId: string;
  status: string;
};

/**
 * How the booking got to where it is, and what is expected next.
 *
 * The trail is secondary to the booking itself, so a failed read is reported in
 * place rather than through the page-level error state — the details and actions
 * beside it are still perfectly usable without it.
 */
export default function BookingTimelineCard({ bookingId, status }: Props) {
  const { steps, isLoading, error } = useBookingTimeline(bookingId, status);

  return (
    <SectionCard title="Progress" icon={<TimelineIcon />} accent="info">
      {isLoading ? (
        <Stack spacing={1.5}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={28} />
          ))}
        </Stack>
      ) : error ? (
        <Typography variant="body2" color="text.secondary">
          The progress trail could not be loaded.
        </Typography>
      ) : (
        <Box>
          {steps.map((step, i) => (
            <TimelineStepRow key={step.key} step={step} isLast={i === steps.length - 1} />
          ))}
        </Box>
      )}
    </SectionCard>
  );
}
