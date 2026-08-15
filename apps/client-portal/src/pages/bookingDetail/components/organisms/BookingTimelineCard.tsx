import { SectionCard, StatusTimeline } from '@sinnapi/ui';
import TimelineIcon from '@mui/icons-material/Timeline';
import { formatDateTime } from '@/lib/config';
import { useBookingTimeline } from '../../hooks/useBookingTimeline';

type Props = {
  bookingId: string;
  status: string;
};

/**
 * How the booking got to where it is, and what is expected next.
 *
 * The trail is secondary to the booking itself, so `StatusTimeline` reports a
 * failed read in place rather than raising it to the page-level error state —
 * the details and actions beside it are still perfectly usable without it.
 */
export default function BookingTimelineCard({ bookingId, status }: Props) {
  const { steps, isLoading, error } = useBookingTimeline(bookingId, status);

  return (
    <SectionCard title="Progress" icon={<TimelineIcon />} accent="info">
      <StatusTimeline
        steps={steps}
        formatTimestamp={formatDateTime}
        isLoading={isLoading}
        error={error}
      />
    </SectionCard>
  );
}
