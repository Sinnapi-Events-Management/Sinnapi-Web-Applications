import { Stack, InfoRow, SectionCard } from '@sinnapi/ui';
import EventNoteIcon from '@mui/icons-material/EventNote';
import TagIcon from '@mui/icons-material/Tag';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PlaceIcon from '@mui/icons-material/Place';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { formatDate, formatDateTime } from '@/lib/config';
import type { VendorBookingDetailModel } from '@/lib/types';

type Props = {
  booking: VendorBookingDetailModel;
  timeWindow: string | null;
};

/**
 * The booking as a record: every stored fact, in the order someone checking one
 * would look for them. Rows that only exist in a given outcome — a completion
 * stamp, a cancellation reason — appear only in that outcome rather than sitting
 * empty the rest of the time.
 */
export default function BookingFactsCard({ booking: b, timeWindow }: Props) {
  return (
    <SectionCard title="Booking details" icon={<EventNoteIcon />}>
      <Stack>
        <InfoRow
          label="Reference"
          icon={<TagIcon />}
          value={b.reference_no}
          copyValue={b.reference_no ?? undefined}
          mono
        />
        <InfoRow label="Event date" icon={<CalendarMonthIcon />} value={formatDate(b.event_date)} />
        {timeWindow && <InfoRow label="Time" icon={<ScheduleIcon />} value={timeWindow} />}
        <InfoRow label="Location" icon={<PlaceIcon />} value={b.location} />
        <InfoRow label="Requested on" icon={<HistoryIcon />} value={formatDateTime(b.created_at)} />
        {b.completed_at && (
          <InfoRow
            label="Completed on"
            icon={<CheckCircleOutlineIcon />}
            value={formatDateTime(b.completed_at)}
          />
        )}
        {b.cancellation_reason && (
          <InfoRow label="Reason" icon={<CancelOutlinedIcon />} value={b.cancellation_reason} />
        )}
      </Stack>
    </SectionCard>
  );
}
