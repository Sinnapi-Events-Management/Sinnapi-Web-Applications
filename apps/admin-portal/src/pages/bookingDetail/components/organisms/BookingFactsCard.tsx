import { Link as RouterLink } from 'react-router-dom';
import { Alert, InfoRow, Link, SectionCard, Stack } from '@sinnapi/ui';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { formatDate, formatDateTime, formatMoney } from '@/lib/config';
import type { BookingAdminModel } from '@/lib/types';

type Props = {
  booking: BookingAdminModel;
  timeWindow: string | null;
};

/**
 * What was agreed, and the timestamps of what has happened since.
 *
 * The lifecycle stamps are only rendered once they exist: a row reading
 * "Started —" on a booking that has not started says nothing the status chip
 * did not already say, and four such rows push the ones that carry information
 * off the first screen.
 */
export default function BookingFactsCard({ booking: b, timeWindow }: Props) {
  return (
    <SectionCard title="Booking" icon={<EventNoteIcon />} accent="info">
      <Stack>
        <InfoRow
          label="Reference"
          value={b.reference_no}
          copyValue={b.reference_no ?? undefined}
          mono
        />
        <InfoRow label="Event date" value={formatDate(b.event_date)} />
        {timeWindow && <InfoRow label="Time" value={timeWindow} />}
        <InfoRow label="Location" value={b.location} />
        <InfoRow label="Agreed amount" value={formatMoney(b.amount, b.currency)} />
        {b.event && (
          <InfoRow
            label="Event"
            value={
              <Link component={RouterLink} to={`/events/${b.event.id}`} underline="hover">
                {b.event.title ?? 'Untitled event'}
              </Link>
            }
          />
        )}
        <InfoRow label="Requested" value={formatDateTime(b.created_at)} />
        {b.started_at && <InfoRow label="Started" value={formatDateTime(b.started_at)} />}
        {b.completed_at && <InfoRow label="Completed" value={formatDateTime(b.completed_at)} />}
        {b.cancelled_by && <InfoRow label="Cancelled by" value={b.cancelled_by} />}
      </Stack>

      {b.cancellation_reason && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {b.cancellation_reason}
        </Alert>
      )}
    </SectionCard>
  );
}
